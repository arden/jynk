import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import type { Product } from '../types';
import { formatUSDC, decryptUrl, shortenAddress } from '../utils';
import { useStore } from '../store';
import { useSolanaPayment, type SolanaPaymentStatus } from '../hooks';

type PaymentStep = 'product' | 'wallet-select' | 'confirm' | 'success';

interface PaymentModalProps {
  product: Product;
  onClose: () => void;
}

const STATUS_MESSAGES: Record<SolanaPaymentStatus, string> = {
  idle: 'Pay',
  signing: 'Sign Payment in Wallet...',
  submitting: 'Submitting Transaction...',
  verifying: 'Verifying Payment...',
  success: 'Payment Complete!',
  error: 'Payment Failed',
};

export function PaymentModal({ product, onClose }: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('product');
  const [unlockedUrl, setUnlockedUrl] = useState<string>('');
  const [txHash, setTxHash] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const { publicKey, connected, select, connect, disconnect, wallets } = useWallet();
  const { setWalletType } = useStore();
  const { status, pay, isProcessing } = useSolanaPayment({
    onSuccess: (result) => {
      setTxHash(result.txHash);
      const url = product.encryptedUrl ? decryptUrl(product.encryptedUrl) : product.targetUrl;
      setUnlockedUrl(url);
      setStep('success');
    },
  });

  const displayAddress = publicKey?.toBase58() || null;

  // Filter wallets based on search
  const filteredWallets = wallets.filter(w => 
    w.adapter.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if wallet is installed
  const isWalletInstalled = (walletName: string): boolean => {
    if (typeof window === 'undefined') return false;
    const name = walletName.toLowerCase();
    const win = window as any;
    
    switch (name) {
      case 'phantom': return !!win.phantom?.solana?.isPhantom;
      case 'solflare': return !!win.solflare?.isSolflare;
      case 'backpack': return !!win.backpack?.isBackpack;
      case 'glow': return !!win.glowSolana;
      default: {
        const wallet = wallets.find(w => w.adapter.name.toLowerCase() === name);
        return wallet?.adapter.readyState === 'Installed' || false;
      }
    }
  };

  const handleWalletSelect = async (wallet: any) => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      select(wallet.adapter.name);
      await new Promise(resolve => setTimeout(resolve, 100));
      await connect();
      setWalletType('solana');
      setStep('confirm');
    } catch (error: any) {
      console.error('Connection failed:', error);
      setConnectionError(error?.message || 'Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setStep('wallet-select');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handlePayment = async () => {
    if (!connected || !publicKey) return;

    await pay({
      productId: product.id,
      payTo: product.creatorAddress,
      amount: product.price,
      resource: product.encryptedUrl || product.targetUrl,
    });
  };

  const getWalletIcon = (walletName: string): string => {
    const icons: Record<string, string> = {
      phantom: '👻',
      solflare: '☀️',
      backpack: '🎒',
      glow: '✨',
      ledger: '📟',
      default: '👛',
    };
    const name = walletName.toLowerCase();
    return Object.entries(icons).find(([key]) => name.includes(key))?.[1] || icons.default;
  };

  const getWalletColor = (walletName: string): string => {
    const colors: Record<string, string> = {
      phantom: '#AB9FF2',
      solflare: '#FC4C4C',
      backpack: '#E93A88',
      glow: '#FFD700',
      ledger: '#000000',
      default: '#6B7280',
    };
    const name = walletName.toLowerCase();
    return Object.entries(colors).find(([key]) => name.includes(key))?.[1] || colors.default;
  };

  // Auto-advance to confirm when wallet connects
  useEffect(() => {
    if (connected && step === 'wallet-select') {
      setStep('confirm');
    }
  }, [connected, step]);

  // Product Step
  if (step === 'product') {
    const isFree = product.price === 0;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md mx-4 p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product Info */}
          <p className="text-slate-400 mb-6">{product.description}</p>

          {/* Price Card */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Price</span>
              <span className="text-2xl font-bold">{formatUSDC(product.price)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Network</span>
              <span className="text-sm">Solana</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={() => connected ? setStep('confirm') : setStep('wallet-select')}
            className="w-full py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            {isFree ? 'Get Access' : 'Pay with Solana'}
          </button>

          <p className="text-center text-green-400 text-sm mt-4">Zero gas fees</p>
        </div>
      </div>
    );
  }

  // Wallet Select Step
  if (step === 'wallet-select') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold">Connect Wallet</h2>
              <p className="text-sm text-slate-500 mt-1">Pay {formatUSDC(product.price)} USDC</p>
            </div>
            <button onClick={() => setStep('product')} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search wallets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Error Message */}
          {connectionError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{connectionError}</p>
            </div>
          )}

          {/* Wallet List */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredWallets.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No wallets found</p>
              </div>
            ) : (
              filteredWallets.map((wallet) => {
                const isInstalled = isWalletInstalled(wallet.adapter.name);
                const icon = getWalletIcon(wallet.adapter.name);
                const color = getWalletColor(wallet.adapter.name);
                
                return (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletSelect(wallet)}
                    disabled={isConnecting}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                      style={{ backgroundColor: color + '20' }}
                    >
                      {icon}
                    </div>
                    <span className="flex-1 text-left font-medium">{wallet.adapter.name}</span>
                    {isInstalled ? (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Installed</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Web</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-4">
            Powered by Solana Wallet Adapter
          </p>
        </div>
      </div>
    );
  }

  // Confirm Step
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md mx-4 p-6">
          <div className="text-center mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">JYNK • SECURE CHECKOUT</p>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-slate-400">Fast, secure payment on Solana</p>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Pay with Solana</h3>
              {displayAddress && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Connected</p>
                  <p className="text-sm text-slate-400">{shortenAddress(displayAddress, 4)}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleDisconnect}
              className="text-sm text-slate-400 hover:text-white underline mb-4"
            >
              Use different wallet
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm text-slate-400">Solana • SOL wallet</span>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="font-bold text-xl">{formatUSDC(product.price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency</span>
                <span>USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Network</span>
                <span>Solana</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gas Fee</span>
                <span className="text-green-400">~$0.00025</span>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
              <p className="text-blue-400 text-sm">
                Make sure you have at least {formatUSDC(product.price)} USDC on Solana before proceeding
              </p>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
            >
              {isProcessing && (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {status === 'idle' ? `Pay ${formatUSDC(product.price)}` : STATUS_MESSAGES[status]}
            </button>

            <p className="text-center text-xs text-slate-500 mt-4">
              Secured by x402 Protocol
            </p>
          </div>

          <button
            onClick={() => setStep('wallet-select')}
            className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  // Success Step
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md mx-4 p-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Purchase Complete!</h2>
        <p className="text-slate-400 mb-6">Your content is ready!</p>
        <a
          href={unlockedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity block mb-4"
        >
          Access Content
        </a>
        {txHash && (
          <a
            href={`https://solscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-primary-400 block"
          >
            View Transaction
          </a>
        )}
        <button
          onClick={onClose}
          className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors mt-4"
        >
          Close
        </button>
      </div>
    </div>
  );
}
