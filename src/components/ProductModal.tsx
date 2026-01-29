import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatUSDC } from '../utils';
import { useSolanaPayment } from '../hooks/useSolanaPayment';
import type { Product } from '../types';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

export function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const { connected: solanaConnected } = useWallet();
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const isFree = product.price === 0;
  const isConnected = solanaConnected;

  const handlePaymentSuccess = (result: { txHash?: string; unlockedContent: string }) => {
    if (result.txHash) {
      setTxHash(result.txHash);
      onSuccess?.(result.txHash);
    }
  };

  const { status, error, isProcessing, pay } = useSolanaPayment({ onSuccess: handlePaymentSuccess });

  const handlePay = () => {
    if (isFree) {
      window.open(product.targetUrl, '_blank');
      onClose();
      return;
    }

    if (!isConnected) {
      return;
    }

    pay({
      productId: product.id,
      payTo: product.creatorAddress,
      amount: product.price,
      resource: product.targetUrl,
    });
  };

  const handleAccessContent = () => {
    window.open(product.targetUrl, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">{product.name}</h2>
          
          {product.description && (
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              {product.description}
            </p>
          )}

          {!txHash && (
            <p className="text-slate-500 text-sm mb-6">
              {isFree ? 'Free access' : 'Pay once, get instant access'}
            </p>
          )}

          {txHash ? (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                <svg className="w-12 h-12 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-400 font-medium">Payment Successful!</p>
                <p className="text-slate-500 text-xs mt-1 font-mono truncate">{txHash}</p>
              </div>
              
              <button
                onClick={handleAccessContent}
                className="w-full py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Access Content
              </button>
            </div>
          ) : (
            <>
              {!isFree && (
                <div className="space-y-4 mb-6">
                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Price</span>
                      <span className="text-white font-bold text-lg">{formatUSDC(product.price)} USDC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Network</span>
                      <span className="text-white font-medium">Solana</span>
                    </div>
                  </div>

                  {!isConnected && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                      <p className="text-amber-400 text-sm text-center">
                        Connect a Solana wallet (Phantom) to pay
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {status !== 'idle' && status !== 'error' && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-3 mb-4">
                  <p className="text-primary-400 text-sm text-center">
                    {status === 'signing' && 'Please sign the transaction in your wallet...'}
                    {status === 'submitting' && 'Submitting transaction...'}
                    {status === 'verifying' && 'Verifying on chain...'}
                  </p>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={isProcessing || (!isFree && !isConnected)}
                className="w-full py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {isProcessing ? 'Processing...' : isFree ? 'Get Access' : 'Pay with Solana'}
              </button>

              {!isFree && (
                <div className="flex items-center justify-center gap-2 mt-4 text-slate-600 text-xs">
                  <span>Phantom</span>
                  <span>•</span>
                  <span>Solflare</span>
                  <span>•</span>
                  <span>Backpack</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-800 p-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
          >
            {txHash ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
