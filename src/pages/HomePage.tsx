import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useStore } from '../store';

export function HomePage() {
  const navigate = useNavigate();
  const { 
    publicKey: solanaKey, 
    connected: solanaConnected,
    select,
    connect,
    wallets
  } = useWallet();
  const store = useStore();
  
  const creatorAddress = solanaKey?.toBase58() || '';

  const [username, setUsername] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'available' | 'taken' | 'invalid' | 'owned'>('idle');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const validateUsername = (name: string) => {
    const cleaned = name.replace(/^@/, '').toLowerCase();
    if (cleaned.length < 3) return false;
    if (cleaned.length > 20) return false;
    if (!/^[a-z0-9_]+$/.test(cleaned)) return false;
    return true;
  };

  const handleCheck = async () => {
    const cleaned = username.replace(/^@/, '').toLowerCase();
    console.log('HomePage handleCheck called with username:', username, 'cleaned:', cleaned);
    
    if (!cleaned) {
      setCheckStatus('idle');
      return;
    }

    if (!validateUsername(cleaned)) {
      setCheckStatus('invalid');
      return;
    }

    setChecking(true);
    try {
      const response = await store.checkUsername(cleaned);
      console.log('HomePage check result:', response, 'available:', response.available);
      
      // Check if username is available
      if (response.available === true) {
        setCheckStatus('available');
      } else {
        setCheckStatus('taken');
      }
    } catch (error) {
      console.error('Failed to check username:', error);
      setCheckStatus('taken');
    }
    setChecking(false);
  };

  // Auto-claim after wallet connection
  useEffect(() => {
    if (solanaConnected && isClaiming && creatorAddress) {
      const completeClaim = async () => {
        const cleaned = username.replace(/^@/, '').toLowerCase();
        await store.updateStoreProfile(creatorAddress, { displayName: `@${cleaned}` });
        setIsClaiming(false);
        navigate('/settings');
      };
      completeClaim();
    }
  }, [solanaConnected, isClaiming, creatorAddress, username, store, navigate]);

  const handleClaim = async () => {
    if (!solanaConnected) {
      // Auto-connect wallet
      setIsClaiming(true);
      
      // Find the first available wallet
      const availableWallet = wallets.find(w => w.adapter.readyState === 'Installed');
      if (availableWallet) {
        try {
          select(availableWallet.adapter.name);
          await new Promise(resolve => setTimeout(resolve, 100));
          await connect();
          // The useEffect above will handle the actual claim after connection
        } catch (error) {
          console.error('Failed to connect wallet:', error);
          setIsClaiming(false);
          setShowLoginPrompt(true);
        }
      } else {
        // If no wallet installed, show prompt
        setIsClaiming(false);
        setShowLoginPrompt(true);
      }
      return;
    }

    // Already connected, claim directly
    const cleaned = username.replace(/^@/, '').toLowerCase();
    await store.updateStoreProfile(creatorAddress, { displayName: `@${cleaned}` });
    navigate('/settings');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/^@/, '');
    setUsername(value);
    setCheckStatus('idle');
    setShowLoginPrompt(false);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center px-4">
      {/* Badge */}
      <div className="mb-8 inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-2 fade-in">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
        </span>
        <span className="text-primary-400 text-sm font-semibold">Built on Solana</span>
      </div>

      {/* Main Heading */}
      <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
        <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          One Link.
        </span>
        <br />
        <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          One Store.
        </span>
        <br />
        <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Instant Pay.
        </span>
      </h1>
      
      {/* Subtitle */}
      <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
        Turn any link into a paid product on Solana.
        <br className="hidden md:block" />
        No hosting. No gateway. Just connect, add, earn.
      </p>

      {/* Username Check Input */}
      <div className="w-full max-w-lg mb-8 fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="relative flex items-center bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden focus-within:border-primary-500/50 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all duration-300 shadow-xl shadow-black/20">
          <span className="text-primary-400/80 text-base pl-5 font-semibold select-none whitespace-nowrap">
            jynk.io/
          </span>
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            className="flex-1 bg-transparent py-4 pr-3 text-white placeholder-slate-500 focus:outline-none text-lg"
            placeholder="yourname"
          />
          <button
            onClick={handleCheck}
            disabled={checking || !username}
            className="mr-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all duration-200"
          >
            {checking ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Checking
              </span>
            ) : (
              'Check'
            )}
          </button>
        </div>

        {/* Status Messages */}
        <div className="mt-3 text-left">
          {checkStatus === 'invalid' && (
            <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Username must be 3-20 characters, lowercase letters, numbers and underscores only.</span>
            </div>
          )}

          {checkStatus === 'taken' && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>This username is already taken. Try another one.</span>
            </div>
          )}

          {checkStatus === 'owned' && (
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">This is your username!</span>
              </div>
              <Link to="/settings" className="text-primary-400 text-sm font-semibold hover:text-primary-300 transition-colors flex items-center gap-1">
                Go to settings
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}

          {checkStatus === 'available' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-400 mb-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">jynk.io/{username}</span>
                <span className="text-green-400/80">is available!</span>
              </div>
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 flex items-center justify-center gap-2"
              >
                {isClaiming ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {solanaConnected ? 'Claiming...' : 'Connecting Wallet...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {solanaConnected ? 'Claim Username' : 'Connect Wallet to Claim'}
                  </>
                )}
              </button>
              
              {/* Show wallet installation prompt if needed */}
              {showLoginPrompt && (
                <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-amber-400 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>No Solana wallet detected. Please install Phantom or Solflare.</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex gap-4 flex-wrap justify-center fade-in" style={{ animationDelay: '0.2s' }}>
        {solanaConnected ? (
          <>
            <Link to="/settings" className="btn-primary text-lg px-8 py-4 shadow-xl shadow-primary-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Setup Store
            </Link>
            <Link to="/dashboard" className="btn-secondary text-lg px-8 py-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Dashboard
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-3 text-slate-500 bg-slate-800/30 rounded-full px-6 py-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Connect your wallet to get started</span>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="mt-24 grid md:grid-cols-2 gap-6 max-w-3xl w-full fade-in" style={{ animationDelay: '0.3s' }}>
        <div className="card text-left group">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-primary-400 transition-colors">Link-to-Product</h3>
          <p className="text-slate-400 leading-relaxed">
            Turn any URL into a paid product in seconds. Files, APIs, exclusive content — anything.
          </p>
        </div>

        <div className="card text-left group">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-7 h-7 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-white group-hover:text-primary-400 transition-colors">Instant Delivery</h3>
          <p className="text-slate-400 leading-relaxed">
            Buyers get immediate access after payment confirms on-chain. No waiting, no manual work.
          </p>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="mt-24 max-w-4xl w-full fade-in" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-xl font-semibold text-center mb-8 text-slate-300">Perfect for</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: 'Tips & Donations', icon: '💰' },
            { label: 'Online Courses', icon: '📚' },
            { label: 'Bookings', icon: '📅' },
            { label: 'API Access', icon: '🔌' },
            { label: 'TG Invites', icon: '💬' },
            { label: 'Premium Content', icon: '⭐' },
            { label: 'Digital Downloads', icon: '📦' },
          ].map((item) => (
            <span
              key={item.label}
              className="px-4 py-2.5 bg-slate-800/40 border border-slate-700/50 rounded-full text-slate-300 text-sm font-medium hover:bg-slate-800/60 hover:border-slate-600 hover:text-white transition-all duration-200 cursor-default flex items-center gap-2"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-24 mb-8 flex flex-col items-center gap-4 fade-in" style={{ animationDelay: '0.5s' }}>
        <div className="h-px w-32 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <p className="text-slate-500 text-sm">
          Create your own store with{' '}
          <span className="text-primary-400 font-semibold">Jynk</span>
        </p>
        <div className="flex items-center gap-4 text-slate-600">
          <a href="#" className="hover:text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="#" className="hover:text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
