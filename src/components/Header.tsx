import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from './WalletConnect';

export function Header() {
  const location = useLocation();
  const { connected: solanaConnected } = useWallet();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center font-bold text-white">
            J
          </div>
          <span className="text-xl font-semibold">Jynk</span>
        </Link>

        <nav className="flex items-center gap-6">
          {solanaConnected && (
            <>
              <Link 
                to="/dashboard" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard' 
                    ? 'text-primary-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              {/* <Link 
                to="/create" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/create' 
                    ? 'text-primary-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Create
              </Link> */}
              <Link 
                to="/settings" 
                className={`text-sm font-medium transition-colors ${
                  location.pathname === '/settings' 
                    ? 'text-primary-400' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Settings
              </Link>
            </>
          )}
          <WalletConnect />
        </nav>
      </div>
    </header>
  );
}
