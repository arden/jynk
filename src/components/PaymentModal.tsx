import { useState, useEffect } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import type { Product } from '../types';
import { formatUSDC, decryptUrl, shortenAddress } from '../utils';
import { useStore } from '../store';
import { useX402Payment, type X402PaymentStatus } from '../hooks';

type PaymentStep = 'product' | 'connect' | 'wallet-select' | 'chain-select' | 'confirm' | 'success';

interface PaymentModalProps {
  product: Product;
  onClose: () => void;
}

const STATUS_MESSAGES: Record<X402PaymentStatus, string> = {
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
  const [, setSelectedWallet] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<'evm' | 'solana' | null>(null);

  const { address: evmAddress, isConnected: evmConnected, connector: evmConnector } = useAccount();
  const { publicKey: solanaKey, connected: solanaConnected, disconnect: disconnectSolana } = useWallet();
  const { setWalletType } = useStore();
  const { connectors, connect, isPending } = useConnect();

  const { status, payDirect, isProcessing } = useX402Payment({
    onSuccess: (result) => {
      if (result.txHash) {
        setTxHash(result.txHash);
      }
      const url = product.encryptedUrl ? decryptUrl(product.encryptedUrl) : product.targetUrl;
      setUnlockedUrl(url);
      setStep('success');
    },
  });

  const isConnected = evmConnected || solanaConnected;
  const displayAddress = evmConnected ? evmAddress : solanaConnected ? solanaKey?.toBase58() : null;

  // Track if we're in the process of switching wallets
  const [isSwitchingWallet, setIsSwitchingWallet] = useState(false);

  // Auto-advance to confirm step when wallet connects (only when coming from wallet/chain select)
  useEffect(() => {
    // Only auto-advance if we're not in the middle of switching wallets
    if (isConnected && !isSwitchingWallet && (step === 'wallet-select' || step === 'chain-select')) {
      setStep('confirm');
    }
  }, [isConnected]); // Only depend on isConnected to avoid triggering on step changes

  const handlePayWithWallet = () => {
    if (isConnected) {
      setStep('confirm');
    } else {
      setStep('connect');
    }
  };

  const handleLoginSignup = () => {
    setStep('wallet-select');
  };

  const handleWalletSelect = async (walletType: 'evm' | 'solana') => {
    setSelectedWallet(walletType);
    if (walletType === 'solana') {
      // For Solana, use wallet adapter to connect
      try {
        // The WalletMultiButton will handle the connection
        // We just need to show the chain select or directly go to confirm
        setStep('chain-select');
      } catch (error) {
        console.error('Solana connection failed:', error);
      }
    } else {
      // EVM wallets - find MetaMask or first available connector
      const metamaskConnector = connectors.find(c => c.name.toLowerCase().includes('metamask'));
      const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
      const walletConnectConnector = connectors.find(c => c.name.toLowerCase().includes('walletconnect'));
      
      // Try to connect with priority: MetaMask > Coinbase > WalletConnect > first available
      const connector = metamaskConnector || coinbaseConnector || walletConnectConnector || connectors[0];
      
      if (connector) {
        try {
          await connect({ connector });
          setWalletType('evm');
          setSelectedChain('evm');
          // Connection success will trigger useEffect to go to confirm step
        } catch (error) {
          console.error('EVM connection failed:', error);
        }
      }
    }
  };

  const handleChainSelect = (chain: 'evm' | 'solana') => {
    setSelectedChain(chain);
    setStep('confirm');
  };

  const handleEvmConnect = async (connector: typeof connectors[number]) => {
    try {
      await connect({ connector });
      setWalletType('evm');
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handlePayment = async () => {
    if (!evmConnected || !evmAddress) return;

    await payDirect({
      productId: product.id,
      payTo: product.creatorAddress,
      amount: product.price,
      network: 'baseSepolia',
      resource: product.encryptedUrl || product.targetUrl,
    });
  };

  const handleBack = () => {
    if (step === 'connect') setStep('product');
    else if (step === 'wallet-select') setStep('connect');
    else if (step === 'chain-select') setStep('wallet-select');
    else if (step === 'confirm') setStep('product');
  };

  // Product Info Step
  if (step === 'product') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md mx-4 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Complete Purchase</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Product Info */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
            {product.description && (
              <p className="text-slate-400 mb-4">{product.description}</p>
            )}
            <p className="text-slate-500 text-sm">Pay once, get instant access</p>
          </div>

          {/* Price Card */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Price</span>
              <span className="text-2xl font-bold">{formatUSDC(product.price)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Network</span>
              <span className="text-sm">Base / Solana</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayWithWallet}
            className="w-full py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Pay with Wallet
          </button>

          {/* Supported Wallets */}
          <p className="text-center text-sm text-slate-500 mt-4">
            Coinbase • MetaMask • Phantom
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors mt-4"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Connect Step
  if (step === 'connect') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md mx-4 p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">JYNK • SECURE CHECKOUT</p>
            <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
            <p className="text-slate-400">Fast, secure payment with zero gas fees</p>
          </div>

          {/* Connect Card */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-8 mb-6">
            <h3 className="text-xl font-semibold text-center mb-2">Connect Wallet</h3>
            <p className="text-slate-400 text-center mb-6">Connect your Solana or Base wallet to continue</p>

            <button
              onClick={handleLoginSignup}
              className="w-full py-3 bg-white text-slate-900 rounded-xl font-medium hover:bg-slate-100 transition-colors"
            >
              Log in or sign up
            </button>

            <p className="text-center text-green-400 text-sm mt-4">Zero gas fees</p>
          </div>

          <button
            onClick={handleBack}
            className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancel Payment
          </button>

          {/* How it works */}
          <div className="mt-8 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-4">How it works:</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lime-400 text-sm font-bold">1</span>
                </div>
                <p className="text-xs text-slate-500">Connect wallet</p>
              </div>
              <div>
                <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lime-400 text-sm font-bold">2</span>
                </div>
                <p className="text-xs text-slate-500">Sign transaction</p>
              </div>
              <div>
                <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lime-400 text-sm font-bold">3</span>
                </div>
                <p className="text-xs text-slate-500">PayAI settles</p>
              </div>
              <div>
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">No gas fees!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wallet Select Step
  if (step === 'wallet-select') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md mx-4 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Log in or sign up</h2>
            <button onClick={handleBack} className="text-slate-400 hover:text-slate-600">
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
              placeholder="Search through 619 wallets..."
              className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Wallet List */}
          <div className="space-y-2">
            <button
              onClick={() => handleWalletSelect('solana')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="flex-1 text-left font-medium">Phantom</span>
              <span className="text-xs bg-slate-200 px-2 py-1 rounded-full">Last used</span>
            </button>

            <button
              onClick={() => handleWalletSelect('evm')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="flex-1 text-left font-medium">MetaMask</span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Installed</span>
            </button>

            <button className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 rounded-xl transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-yellow-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="flex-1 text-left font-medium">Rainbow</span>
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Powered by x402 Protocol
          </p>
        </div>
      </div>
    );
  }

  // Chain Select Step
  if (step === 'chain-select') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white text-slate-900 rounded-2xl w-full max-w-md mx-4 p-6">
          <div className="flex justify-between items-center mb-6">
            <button onClick={handleBack} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-xl font-semibold">Select Chain</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Wallet Icon */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <p className="text-slate-500 text-sm">
              This wallet supports multiple chains. Select which chain you'd like to connect to
            </p>
          </div>

          {/* Chain Options */}
          <div className="space-y-2">
            <button
              onClick={async () => {
                // Trigger Solana wallet connection
                try {
                  // For Solana, we need to use the wallet adapter
                  // The WalletMultiButton component handles the actual connection
                  // But we need to trigger it programmatically
                  setSelectedChain('solana');
                  // Wait a bit for the wallet modal to appear
                  setTimeout(() => {
                    // The connection will be handled by the wallet adapter
                    // Once connected, useEffect will auto-advance to confirm
                  }, 100);
                } catch (error) {
                  console.error('Solana connection failed:', error);
                }
              }}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="flex-1 text-left font-medium">Solana</span>
              <span className="text-xs bg-slate-200 px-2 py-1 rounded-full">Last used</span>
            </button>

            <button
              onClick={() => handleChainSelect('evm')}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <span className="flex-1 text-left font-medium">EVM</span>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Installed</span>
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Powered by x402 Protocol
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
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">JYNK • SECURE CHECKOUT</p>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-slate-400">Fast, secure payment with zero gas fees</p>
          </div>

          {/* Payment Details */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                Pay with {selectedChain === 'solana' ? 'Solana' : 'Base'}
              </h3>
              {isConnected && displayAddress && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Connected</p>
                  <p className="text-sm text-slate-400">{shortenAddress(displayAddress, 4)}</p>
                </div>
              )}
            </div>

            {isConnected && (
              <button
                onClick={async () => {
                  setIsSwitchingWallet(true);
                  
                  // Disconnect current wallet first and wait for it to complete
                  try {
                    if (evmConnected && evmConnector) {
                      await evmConnector.disconnect();
                    }
                    if (solanaConnected) {
                      await disconnectSolana();
                    }
                  } catch (err) {
                    console.log('Disconnect error (can be ignored):', err);
                  }
                  
                  // Wait for disconnect to propagate before changing step
                  setTimeout(() => {
                    setStep('wallet-select');
                    // Reset switching flag after step change
                    setTimeout(() => setIsSwitchingWallet(false), 500);
                  }, 300);
                }}
                className="text-sm text-slate-400 hover:text-white underline mb-4"
              >
                Use different wallet
              </button>
            )}

            {/* Network Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${selectedChain === 'solana' ? 'bg-purple-500' : 'bg-blue-500'}`} />
              <span className="text-sm text-slate-400">
                {selectedChain === 'solana' ? 'Solana' : 'Base'} • {selectedChain === 'solana' ? 'SOL' : 'ETH'} wallet
              </span>
            </div>

            {/* Amount Details */}
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
                <span>{selectedChain === 'solana' ? 'Solana' : 'Base'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gas Fee</span>
                <span className="text-green-400">$0.00</span>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mt-4">
              <p className="text-blue-400 text-sm">
                Make sure you have at least {formatUSDC(product.price)} USDC on {selectedChain === 'solana' ? 'Solana' : 'Base'} before proceeding
              </p>
            </div>

            {/* Pay Button */}
            {!isConnected ? (
              <div className="mt-4 space-y-2">
                {selectedChain === 'evm' ? (
                  connectors.map((connector) => (
                    <button
                      key={connector.uid}
                      onClick={() => handleEvmConnect(connector)}
                      disabled={isPending}
                      className="w-full py-3 bg-lime-400 text-slate-900 rounded-xl font-semibold hover:bg-lime-500 transition-colors"
                    >
                      {isPending ? 'Connecting...' : `Connect ${connector.name}`}
                    </button>
                  ))
                ) : (
                  <WalletMultiButton className="w-full !bg-lime-400 !text-slate-900 !rounded-xl !py-3 !h-auto !font-semibold hover:!bg-lime-500" />
                )}
              </div>
            ) : (
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-4 bg-lime-400 text-slate-900 rounded-xl font-semibold hover:bg-lime-500 transition-colors mt-4 flex items-center justify-center gap-2"
              >
                {isProcessing && (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {status === 'idle' ? `Pay ${formatUSDC(product.price)}` : STATUS_MESSAGES[status]}
              </button>
            )}

            <p className="text-center text-xs text-slate-500 mt-4">
              Secured by x402 Protocol
            </p>
          </div>

          <button
            onClick={handleBack}
            className="w-full py-3 text-slate-500 hover:text-slate-300 transition-colors"
          >
            Cancel Payment
          </button>

          {/* How it works */}
          <div className="mt-6 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
            <p className="text-sm text-slate-400 mb-4">How it works:</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lime-400 text-sm font-bold">1</span>
                </div>
                <p className="text-xs text-slate-500">Connect wallet</p>
              </div>
              <div>
                <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lime-400 text-sm font-bold">2</span>
                </div>
                <p className="text-xs text-slate-500">Sign transaction</p>
              </div>
              <div>
                <div className="w-8 h-8 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-lime-400 text-sm font-bold">3</span>
                </div>
                <p className="text-xs text-slate-500">PayAI settles</p>
              </div>
              <div>
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-slate-500">No gas fees!</p>
              </div>
            </div>
          </div>
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
          className="btn-primary w-full block text-center mb-4"
        >
          Access Content
        </a>
        {txHash && (
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
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
