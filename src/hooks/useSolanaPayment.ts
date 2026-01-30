import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import { getUsdcMint, USDC_DECIMALS, getFallbackConnection } from '../config/solana';
import { PaymentApi } from '../services/api';

export type SolanaPaymentStatus = 'idle' | 'signing' | 'submitting' | 'verifying' | 'success' | 'error';

interface UseSolanaPaymentOptions {
  onSuccess?: (result: { txHash: string; unlockedContent: string }) => void;
  onError?: (error: Error) => void;
}

interface SolanaPaymentRequest {
  productId: string;
  payTo: string;
  amount: number;
  resource: string;
}

// Helper function to check if error is RPC related
const isRpcError = (error: any): boolean => {
  if (!error) return false;
  const message = error.message || String(error);
  return message.includes('403') || 
         message.includes('Access forbidden') ||
         message.includes('rate limit') ||
         message.includes('timeout') ||
         message.includes('fetch') ||
         message.includes('network');
};

export function useSolanaPayment(options: UseSolanaPaymentOptions = {}) {
  const [status, setStatus] = useState<SolanaPaymentStatus>('idle');
  const [error, setError] = useState<string>('');

  const { publicKey, sendTransaction } = useWallet();
  const { connection: primaryConnection } = useConnection();

  const pay = useCallback(async (request: SolanaPaymentRequest) => {
    if (!publicKey) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    setStatus('signing');
    setError('');

    // Try with primary connection first, fallback if needed
    let connection = primaryConnection;
    

    try {
      const usdcMint = getUsdcMint();
      // Ensure payTo is a valid Solana address (base58 encoded)
      const payToAddress = request.payTo.startsWith('0x') 
        ? request.payTo.slice(2) // Remove 0x prefix if present
        : request.payTo;
      const recipientPubkey = new PublicKey(payToAddress);
      const amountInUnits = BigInt(Math.round(request.amount * Math.pow(10, USDC_DECIMALS)));

      const senderAta = await getAssociatedTokenAddress(usdcMint, publicKey);
      const recipientAta = await getAssociatedTokenAddress(usdcMint, recipientPubkey);

      const transaction = new Transaction();

      // Try to get account info - if RPC fails, switch to fallback
      try {
        await getAccount(connection, recipientAta);
      } catch (err) {
        if (isRpcError(err)) {
          console.warn('Primary RPC failed, switching to fallback...');
          connection = getFallbackConnection();
          
          // Retry with fallback
          try {
            await getAccount(connection, recipientAta);
          } catch (fallbackErr) {
            // If fallback also fails, check if it's TokenAccountNotFoundError
            if (fallbackErr instanceof TokenAccountNotFoundError) {
              transaction.add(
                createAssociatedTokenAccountInstruction(
                  publicKey,
                  recipientAta,
                  recipientPubkey,
                  usdcMint
                )
              );
            } else {
              throw fallbackErr;
            }
          }
        } else if (err instanceof TokenAccountNotFoundError) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey,
              recipientAta,
              recipientPubkey,
              usdcMint
            )
          );
        } else {
          throw err;
        }
      }

      transaction.add(
        createTransferInstruction(
          senderAta,
          recipientAta,
          publicKey,
          amountInUnits
        )
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      setStatus('submitting');

      const signature = await sendTransaction(transaction, connection);

      setStatus('verifying');

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      // Use backend API to record payment
      const response = await PaymentApi.verifyPayment(request.productId, signature, publicKey.toBase58());

      setStatus('success');

      options.onSuccess?.({
        txHash: signature,
        unlockedContent: response.data?.unlockedContent || request.resource,
      });

      return { txHash: signature, unlockedContent: request.resource };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      
      // Provide user-friendly error messages
      let userFriendlyError = errorMessage;
      if (isRpcError(err)) {
        userFriendlyError = 'Network connection issue. Please check your internet connection and try again.';
      } else if (errorMessage.includes('insufficient funds')) {
        userFriendlyError = 'Insufficient USDC balance. Please add funds to your wallet.';
      } else if (errorMessage.includes('User rejected')) {
        userFriendlyError = 'Transaction was cancelled.';
      }
      
      setError(userFriendlyError);
      setStatus('error');
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [publicKey, primaryConnection, sendTransaction, options]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return {
    status,
    error,
    pay,
    reset,
    isProcessing: ['signing', 'submitting', 'verifying'].includes(status),
  };
}
