import { useWallet } from '@solana/wallet-adapter-react';
import { useStore } from '../store';
import { shortenAddress } from '../utils';

export function WalletConnect() {
  const { publicKey, disconnect, connected, select, wallets, connect } = useWallet();
  const { setCurrentUser, setWalletType } = useStore();

  const displayAddress = publicKey?.toBase58() || null;

  const handleDisconnect = () => {
    disconnect();
    setCurrentUser(null);
    setWalletType(null);
  };

  const handleConnect = async () => {
    // Find the first available wallet
    const availableWallet = wallets.find(w => w.adapter.readyState === 'Installed');
    if (availableWallet) {
      try {
        select(availableWallet.adapter.name);
        await new Promise(resolve => setTimeout(resolve, 100));
        await connect();
        setWalletType('solana');
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    } else {
      // If no wallet installed, try to connect with the first one (will show install prompt)
      if (wallets.length > 0) {
        try {
          select(wallets[0].adapter.name);
          await new Promise(resolve => setTimeout(resolve, 100));
          await connect();
          setWalletType('solana');
        } catch (error) {
          console.error('Failed to connect wallet:', error);
        }
      }
    }
  };

  if (connected && displayAddress) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium">{shortenAddress(displayAddress)}</span>
        </div>
        <button onClick={handleDisconnect} className="btn-secondary text-sm py-2">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="btn-wallet flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      Connect Wallet
    </button>
  );
}
