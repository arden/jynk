import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useStore } from '../store';

export function HomePage() {
  const navigate = useNavigate();
  const { publicKey: solanaKey, connected: solanaConnected } = useWallet();
  const store = useStore();
  
  const creatorAddress = solanaKey?.toBase58() || '';

  const [username, setUsername] = useState('');
  const [checkStatus, setCheckStatus] = useState<'idle' | 'available' | 'taken' | 'invalid' | 'owned'>('idle');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [checking, setChecking] = useState(false);

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

  const handleClaim = async () => {
    if (!solanaConnected) {
      setShowLoginPrompt(true);
      return;
    }

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
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-center">
      <div className="mb-6 inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-1.5">
        <span className="text-primary-400 text-sm font-medium">Built on Solana & x402 Protocol</span>
      </div>

      <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
        One Link. One Store.
        <br />
        <span className="text-primary-400">Solana Instant Pay.</span>
      </h1>
      
      <p className="text-xl text-slate-400 max-w-2xl mb-8">
        Turn any link into instant payment on Solana.
        <br />
        No hosting. No gateway. Just connect, add, earn.
      </p>

      <div className="w-full max-w-md mb-8">
        <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden focus-within:border-primary-500 transition-colors">
          <span className="text-primary-400/70 text-sm pl-4 font-medium select-none whitespace-nowrap">
            jynk.io/
          </span>
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
            className="flex-1 bg-transparent py-3.5 pr-2 text-white placeholder-slate-500 focus:outline-none"
            placeholder="username"
          />
          <button
            onClick={handleCheck}
            disabled={checking}
            className="px-4 py-2 mr-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            {checking ? '...' : 'Check'}
          </button>
        </div>

        {checkStatus === 'invalid' && (
          <p className="text-amber-400 text-sm mt-2 text-left">
            Username must be 3-20 characters, only letters, numbers and underscore.
          </p>
        )}

        {checkStatus === 'taken' && (
          <p className="text-red-400 text-sm mt-2 text-left">
            This username is already taken. Try another one.
          </p>
        )}

        {checkStatus === 'owned' && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-left">
            <p className="text-green-400 text-sm">This is your username!</p>
            <Link to="/settings" className="text-primary-400 text-sm hover:underline">
              Go to settings →
            </Link>
          </div>
        )}

        {checkStatus === 'available' && (
          <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-green-400 text-sm mb-2">
              <span className="font-medium">jynk.io/{username}</span> is available!
            </p>
            {showLoginPrompt ? (
              <p className="text-slate-400 text-sm">
                Connect your wallet above to claim this username.
              </p>
            ) : (
              <button
                onClick={handleClaim}
                className="w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {solanaConnected ? 'Claim Username' : 'Connect Wallet to Claim'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-4 flex-wrap justify-center">
        {solanaConnected ? (
          <>
            <Link to="/settings" className="btn-primary text-lg px-8 py-3">
              Setup Store
            </Link>
            <Link to="/dashboard" className="btn-secondary text-lg px-8 py-3">
              View Dashboard
            </Link>
          </>
        ) : (
          <div className="text-slate-400">
            Connect your wallet to get started
          </div>
        )}
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-8 max-w-4xl">
        <div className="card text-left">
          <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Link-to-Product</h3>
          <p className="text-sm text-slate-400">
            Turn any URL into a paid product in seconds. Files, APIs, exclusive content.
          </p>
        </div>

        <div className="card text-left">
          <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4">
            <span className="text-primary-400 font-bold text-sm">402</span>
          </div>
          <h3 className="font-semibold mb-2">x402 Protocol</h3>
          <p className="text-sm text-slate-400">
            HTTP-native payments. Sign once, access instantly. Zero protocol fees.
          </p>
        </div>

        <div className="card text-left">
          <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">Instant Delivery</h3>
          <p className="text-sm text-slate-400">
            Buyers get access immediately after payment confirms on-chain.
          </p>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="mt-20 max-w-4xl w-full">
        <h2 className="text-2xl font-bold text-center mb-8">Perfect for</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            'Tips',
            'Courses',
            'Bookings',
            'APIs',
            'TG Invites',
            'Premium content',
            'Remittance',
          ].map((item) => (
            <span
              key={item}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-slate-300 text-sm font-medium hover:bg-slate-800 hover:border-slate-600 transition-colors cursor-default"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-16 text-slate-500 text-sm">
        <p>Create your own store</p>
      </div>
    </div>
  );
}
