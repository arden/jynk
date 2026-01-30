import { useState, useEffect } from 'react';
import { useWallet, Wallet } from '@solana/wallet-adapter-react';
import { formatUSDC } from '../utils';
import { useSolanaPayment } from '../hooks/useSolanaPayment';
import type { Product } from '../types';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onSuccess?: (txHash: string) => void;
}

export function ProductModal({ product, onClose, onSuccess }: ProductModalProps) {
  const { 
    connected: solanaConnected, 
    select, 
    connect, 
    wallets,
    publicKey
  } = useWallet();
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const isFree = product.price === 0;
  const isConnected = solanaConnected;

  const handlePaymentSuccess = (result: { txHash?: string; unlockedContent: string }) => {
    if (result.txHash) {
      setTxHash(result.txHash);
      onSuccess?.(result.txHash);
    }
  };

  const { status, error, isProcessing, pay } = useSolanaPayment({ 
    onSuccess: handlePaymentSuccess 
  });

  // Auto-pay after wallet connection
  useEffect(() => {
    if (isConnected && isConnecting && publicKey && !isFree && selectedWallet) {
      // Wallet connected, proceed with payment
      setIsConnecting(false);
      setShowWalletSelection(false);
      pay({
        productId: product.id,
        payTo: product.creatorAddress,
        amount: product.price,
        resource: product.targetUrl,
      });
    }
  }, [isConnected, isConnecting, publicKey, isFree, product, pay, selectedWallet]);

  const handlePay = async () => {
    if (isFree) {
      window.open(product.targetUrl, '_blank');
      onClose();
      return;
    }

    if (!isConnected) {
      // Show wallet selection instead of auto-connecting
      setShowWalletSelection(true);
      setConnectionError(null);
      return;
    }

    // Already connected, pay directly
    pay({
      productId: product.id,
      payTo: product.creatorAddress,
      amount: product.price,
      resource: product.targetUrl,
    });
  };

  const handleSelectWallet = async (selectedWallet: Wallet) => {
    setSelectedWallet(selectedWallet);
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      // Select the wallet
      select(selectedWallet.adapter.name);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      await connect();
      // The useEffect above will handle the payment after connection
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setConnectionError(err?.message || 'Failed to connect wallet. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleAccessContent = () => {
    window.open(product.targetUrl, '_blank');
    onClose();
  };

  const handleBackToProduct = () => {
    setShowWalletSelection(false);
    setConnectionError(null);
    setSelectedWallet(null);
  };

  // Get installed wallets
  const installedWallets = wallets.filter(w => 
    w.adapter.readyState === 'Installed'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300" 
        onClick={!isProcessing && !isConnecting ? onClose : undefined} 
      />
      
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-black/50 scale-in">
        {/* Close Button */}
        {!isProcessing && !isConnecting && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-full transition-all duration-200 z-10"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="p-6">
          {/* Product Icon */}
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-2xl flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{product.name}</h2>
          
          {product.description && (
            <p className="text-slate-400 text-sm mb-5 leading-relaxed">
              {product.description}
            </p>
          )}

          {!txHash && (
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{isFree ? 'Free access - No payment required' : 'Pay once, get instant access forever'}</span>
            </div>
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
          ) : showWalletSelection ? (
            /* Wallet Selection View */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={handleBackToProduct}
                  disabled={isConnecting}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-lg font-semibold text-white">Select Wallet</h3>
              </div>

              {/* Error Message */}
              {connectionError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{connectionError}</p>
                </div>
              )}

              {installedWallets.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    Detected Wallets ({installedWallets.length})
                  </p>
                  {installedWallets.map((wallet) => (
                    <button
                      key={wallet.adapter.name}
                      onClick={() => handleSelectWallet(wallet)}
                      disabled={isConnecting}
                      className="w-full flex items-center gap-4 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 rounded-xl transition-all disabled:opacity-50 group text-left"
                    >
                      {/* Wallet Icon */}
                      <div className="w-12 h-12 bg-slate-700 group-hover:bg-slate-600 rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                        {wallet.adapter.icon ? (
                          <img 
                            src={wallet.adapter.icon} 
                            alt={wallet.adapter.name}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            {wallet.adapter.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      
                      {/* Wallet Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-lg">{wallet.adapter.name}</p>
                        <p className="text-xs text-slate-400">
                          {isConnecting && selectedWallet?.adapter.name === wallet.adapter.name 
                            ? 'Connecting...' 
                            : 'Click to connect'}
                        </p>
                      </div>

                      {/* Status */}
                      {isConnecting && selectedWallet?.adapter.name === wallet.adapter.name ? (
                        <svg className="animate-spin h-6 w-6 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 mb-2">No wallets detected</p>
                  <p className="text-slate-500 text-sm mb-6">Install a Solana wallet to continue</p>
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary-500/25"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Install Phantom
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Product Payment View */
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
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Status Messages */}
              {(isProcessing || status !== 'idle' && status !== 'error') && (
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-primary-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-primary-400 text-sm font-medium">
                      {status === 'signing' && 'Please sign the transaction in your wallet...'}
                      {status === 'submitting' && 'Submitting transaction...'}
                      {status === 'verifying' && 'Verifying on chain...'}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={isProcessing || isConnecting}
                className="w-full py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>
                      {isFree ? 'Get Access' : isConnected ? 'Pay with Solana' : 'Connect Wallet & Pay'}
                    </span>
                  </>
                )}
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
            disabled={isProcessing || isConnecting}
            className="w-full py-2 text-slate-500 hover:text-slate-300 transition-colors text-sm disabled:opacity-50"
          >
            {txHash ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
