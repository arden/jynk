import { useState, useCallback } from 'react';
import { useAccount, useSignTypedData, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, keccak256, toHex } from 'viem';
import { X402_CONFIG, createPaymentPayload } from '../config/x402';
import { USDC_ABI } from '../config/wagmi';
import { PaymentApi } from '../services/api';

const EIP712_DOMAIN = {
  name: 'USD Coin',
  version: '2',
  verifyingContract: X402_CONFIG.usdc.baseSepolia as `0x${string}`,
} as const;

const AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

export type X402PaymentStatus = 'idle' | 'signing' | 'submitting' | 'verifying' | 'success' | 'error';

interface UseX402PaymentOptions {
  onSuccess?: (result: { txHash?: string; unlockedContent: string }) => void;
  onError?: (error: Error) => void;
}

interface PaymentRequest {
  productId: string;
  payTo: string;
  amount: number;
  network: 'base' | 'baseSepolia' | 'solana';
  resource: string;
}

export function useX402Payment(options: UseX402PaymentOptions = {}) {
  const [status, setStatus] = useState<X402PaymentStatus>('idle');
  const [error, setError] = useState<string>('');

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signTypedDataAsync } = useSignTypedData();

  const pay = useCallback(async (request: PaymentRequest) => {
    if (!address || !walletClient || !publicClient) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    setStatus('signing');
    setError('');

    try {
      const amountInUnits = parseUnits(request.amount.toString(), 6);
      const nonce = keccak256(toHex(Date.now().toString() + Math.random().toString()));
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 300);

      const chainId = request.network === 'base' ? 8453 : 84532;
      const usdcAddress = request.network === 'base' 
        ? X402_CONFIG.usdc.base 
        : X402_CONFIG.usdc.baseSepolia;

      const signature = await signTypedDataAsync({
        domain: {
          ...EIP712_DOMAIN,
          chainId,
          verifyingContract: usdcAddress as `0x${string}`,
        },
        types: AUTHORIZATION_TYPES,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: address,
          to: request.payTo as `0x${string}`,
          value: amountInUnits,
          validAfter: BigInt(0),
          validBefore,
          nonce: nonce as `0x${string}`,
        },
      });

      setStatus('submitting');

      const networkId = request.network === 'base' 
        ? X402_CONFIG.supportedNetworks.base 
        : X402_CONFIG.supportedNetworks.baseSepolia;

      const paymentPayload = createPaymentPayload(
        networkId,
        signature,
        address,
        request.payTo,
        amountInUnits.toString(),
        nonce
      );

      setStatus('verifying');

      // Use backend API
      const response = await PaymentApi.verifyX402(request.productId, paymentPayload, address);

      if (!response.success) {
        throw new Error(response.error || 'Payment verification failed');
      }
      
      setStatus('success');
      options.onSuccess?.({
        txHash: response.data?.txHash,
        unlockedContent: response.data?.unlockedContent || request.resource,
      });

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      setStatus('error');
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [address, walletClient, publicClient, signTypedDataAsync, options]);

  const payDirect = useCallback(async (request: PaymentRequest) => {
    // Handle Solana payments differently
    if (request.network === 'solana') {
      setError('Solana payments require the useSolanaPayment hook');
      setStatus('error');
      return;
    }

    if (!address || !walletClient || !publicClient) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    setStatus('signing');
    setError('');

    try {
      const amountInUnits = parseUnits(request.amount.toString(), 6);
      const usdcAddress = request.network === 'base' 
        ? X402_CONFIG.usdc.base 
        : X402_CONFIG.usdc.baseSepolia;

      setStatus('submitting');

      const hash = await walletClient.writeContract({
        address: usdcAddress as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [request.payTo as `0x${string}`, amountInUnits],
      });

      setStatus('verifying');

      await publicClient?.waitForTransactionReceipt({ hash });

      // Use backend API to record payment
      const network = request.network === 'base' ? 'base' : 'base';
      const response = await PaymentApi.directPay(request.productId, hash, network, address);

      setStatus('success');
      
      options.onSuccess?.({
        txHash: hash,
        unlockedContent: response.data?.unlockedContent || request.resource,
      });

      return { txHash: hash, unlockedContent: request.resource };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      setStatus('error');
      options.onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [address, walletClient, publicClient, options]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError('');
  }, []);

  return {
    status,
    error,
    pay,
    payDirect,
    reset,
    isProcessing: ['signing', 'submitting', 'verifying'].includes(status),
  };
}
