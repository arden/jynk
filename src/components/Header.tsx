import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnect } from './WalletConnect';

export function Header() {
  const location = useLocation();
  const { connected: solanaConnected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = solanaConnected
    ? [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/settings', label: 'Settings' },
      ]
    : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/50 bg-slate-900/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-105">
            J
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Jynk
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                location.pathname === link.path
                  ? 'text-primary-400 bg-primary-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {link.label}
              {location.pathname === link.path && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-400 rounded-full" />
              )}
            </Link>
          ))}
          <div className="ml-4 pl-4 border-l border-slate-800">
            <WalletConnect />
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <WalletConnect />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all duration-200"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="px-4 py-2 border-t border-slate-800/50 bg-slate-900/90 backdrop-blur-xl">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 mb-1 last:mb-0 ${
                location.pathname === link.path
                  ? 'text-primary-400 bg-primary-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
