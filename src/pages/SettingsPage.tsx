import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useStore } from '../store';
import { WalletConnect } from '../components/WalletConnect';
import { ProductManager } from '../components/ProductManager';
import { THEMES } from '../config/themes';
import { SOCIAL_PLATFORMS } from '../config/socials';
import { StorePreview } from '../components/StorePreview';
import type { ThemeId, SocialLink, Product } from '../types';

type TabType = 'profile' | 'products' | 'theme' | 'socials';

export function SettingsPage() {
  const { publicKey: solanaKey, connected: solanaConnected } = useWallet();
  const store = useStore();
  const creatorAddress = solanaKey?.toBase58() || '';
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [theme, setTheme] = useState<ThemeId>('midnight');
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!creatorAddress) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [storeData, prods] = await Promise.all([
          store.fetchStore(creatorAddress),
          store.fetchProducts(creatorAddress, true),
        ]);

        if (storeData) {
          setDisplayName(storeData.profile.username || '');
          setBio(storeData.profile.bio);
          setAvatar(storeData.profile.avatar);
          setTheme(storeData.profile.theme);
          const socialMap: Record<string, string> = {};
          storeData.profile.socials.forEach((s: SocialLink) => {
            socialMap[s.platform] = s.url;
          });
          setSocials(socialMap);
        }
        setProducts(prods);
      } catch (error) {
        console.error('Failed to load store data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [creatorAddress, store]);

  if (!solanaConnected) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center py-12">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold mb-3">Wallet Disconnected</h1>
          <p className="text-slate-400 mb-8 max-w-sm mx-auto">
            Connect your Solana wallet to customize your store settings.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <WalletConnect />
            <Link 
              to="/" 
              className="btn-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Home
            </Link>
          </div>
          
          {/* Help Text */}
          <p className="mt-8 text-slate-500 text-sm">
            Don't have a wallet?{' '}
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 transition-colors"
            >
              Get Phantom
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 mx-auto mb-4 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    const socialLinks: SocialLink[] = Object.entries(socials)
      .filter(([, value]) => value.trim())
      .map(([platform, url]) => ({
        platform: platform as SocialLink['platform'],
        url: url.trim(),
      }));

    try {
      await store.updateStoreProfile(creatorAddress, {
        displayName,
        bio,
        avatar,
        theme,
        socials: socialLinks,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatar(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateSocial = (platform: string, value: string) => {
    setSocials(prev => ({ ...prev, [platform]: value }));
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'products', label: 'Products' },
    { id: 'theme', label: 'Theme' },
    { id: 'socials', label: 'Socials' },
  ];

  const storeUrl = displayName
    ? `/s/${displayName.replace(/^@/, '')}`
    : `/s/${creatorAddress}`;

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Store Settings</h1>
          <Link
            to={storeUrl}
            className="text-sm text-primary-400 hover:text-primary-300 lg:hidden"
          >
            Preview
          </Link>
        </div>

        <div className="flex border-b border-slate-800 mb-6 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-6">
            <p className="text-slate-400 text-sm">Set your avatar, display name and bio for your store.</p>
            
            <div className="flex flex-col items-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full cursor-pointer group"
              >
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className={`w-full h-full rounded-full bg-gradient-to-br ${THEMES[theme].colors.avatarFrom} ${THEMES[theme].colors.avatarTo} flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">
                      {displayName.replace('@', '').slice(0, 2).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <p className="text-xs text-slate-500 mt-2">Click to upload (max 2MB)</p>
              {avatar && (
                <button onClick={() => setAvatar(undefined)} className="text-xs text-red-400 hover:text-red-300 mt-1">
                  Remove avatar
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Username</label>
              <div className="flex items-center bg-slate-800 border border-slate-600 rounded-lg px-4 py-3">
                <span className="text-slate-400 mr-1">jynk.io/</span>
                <input
                  type="text"
                  value={displayName.replace(/^@/, '')}
                  onChange={(e) => setDisplayName(e.target.value.startsWith('@') ? e.target.value : `@${e.target.value}`)}
                  className="bg-transparent flex-1 text-white focus:outline-none"
                  placeholder="username"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">This will be your store URL</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="input-field min-h-[100px] resize-none"
                placeholder="Tell visitors about yourself..."
                maxLength={160}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">{bio.length}/160</p>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <ProductManager products={products} onProductsChange={setProducts} />
        )}

        {activeTab === 'theme' && (
          <div className="space-y-6">
            <p className="text-slate-400 text-sm">Choose a theme for your store page.</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(THEMES).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    theme === t.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-full h-10 rounded-lg bg-gradient-to-r ${t.colors.avatarFrom} ${t.colors.avatarTo} mb-3`} />
                  <p className="text-sm font-medium">{t.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'socials' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Add your usernames. These appear as icons on your store.</p>
            
            <div className="space-y-3">
              {SOCIAL_PLATFORMS.map((platform) => {
                const prefix = platform.platform === 'website' ? '' : (platform.baseUrl?.replace('https://', '') || '');
                return (
                  <div key={platform.platform} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800/80 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d={platform.icon} />
                      </svg>
                    </div>
                    <div className="flex-1 flex items-center bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden focus-within:border-primary-500 transition-colors">
                      {prefix && (
                        <span className="text-primary-400/70 text-sm pl-3 select-none whitespace-nowrap font-medium">
                          {prefix}
                        </span>
                      )}
                      <input
                        type="text"
                        value={socials[platform.platform] || ''}
                        onChange={(e) => updateSocial(platform.platform, e.target.value)}
                        className={`flex-1 bg-transparent py-3 pr-4 text-white placeholder-slate-500 focus:outline-none text-sm ${prefix ? 'pl-0' : 'pl-3'}`}
                        placeholder={platform.placeholder}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab !== 'products' && (
          <div className="sticky bottom-0 left-0 right-0 mt-8 -mx-4 px-4 py-4 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 lg:mx-0 lg:px-0 lg:rounded-xl lg:bg-slate-800/50 lg:border lg:border-slate-700">
            <button
              onClick={handleSave}
              disabled={saved}
              className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="hidden lg:block w-[380px] flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">Live Preview</h3>
            <Link to={storeUrl} className="text-xs text-primary-400 hover:text-primary-300">
              Open Store →
            </Link>
          </div>
          <div className="h-[600px] border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/50">
            <StorePreview
              address={creatorAddress}
              displayName={displayName}
              bio={bio}
              avatar={avatar}
              theme={theme}
              socials={Object.entries(socials)
                .filter(([, value]) => value.trim())
                .map(([platform, url]) => ({
                  platform: platform as SocialLink['platform'],
                  url: url.trim(),
                }))}
              products={products}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
