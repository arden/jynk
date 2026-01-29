import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore } from '../store';
import { shortenAddress, formatUSDC } from '../utils';
import { THEMES } from '../config/themes';
import { SOCIAL_PLATFORMS, getSocialUrl } from '../config/socials';
import { ProductModal } from '../components/ProductModal';
import { ShareMenu } from '../components/ShareMenu';
import type { Product, StoreProfile } from '../types';

export function StorePage() {
  const { address: urlParam } = useParams<{ address: string }>();
  const store = useStore();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showShare, setShowShare] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine the actual address
  const resolvedAddress = urlParam || null;

  useEffect(() => {
    const loadStore = async () => {
      if (resolvedAddress) {
        setLoading(true);
        try {
          // Try to fetch store - fetchStore handles both username and address
          const storeData = await store.fetchStore(resolvedAddress);
          if (storeData) {
            setProfile(storeData.profile);
            setProducts(storeData.products);
            // Use the resolved address for incrementing views
            const address = storeData.profile ? resolvedAddress : null;
            if (address) {
              await store.incrementViews(address);
            }
          }
        } catch (error) {
          console.error('Failed to load store:', error);
        }
        setLoading(false);
      }
    };
    loadStore();
  }, [resolvedAddress, store]);

  // Click outside to hide share menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(event.target as Node)) {
        setShowShare(false);
      }
    };

    if (showShare) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShare]);

  if (!resolvedAddress || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!profile || products.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Store not found.</p>
      </div>
    );
  }

  const theme = THEMES[profile.theme];

  return (
    <div className={`min-h-screen ${theme.colors.background}`}>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className={`w-24 h-24 bg-gradient-to-br ${theme.colors.avatarFrom} ${theme.colors.avatarTo} rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg`}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">
                {resolvedAddress.slice(2, 4).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className={`text-xl font-bold ${theme.colors.text} mb-1`}>
            {profile.displayName}
          </h1>
          {profile.bio && (
            <p className={`${theme.colors.textMuted} text-sm mb-3 max-w-xs mx-auto`}>
              {profile.bio}
            </p>
          )}
          <p className={`text-slate-500 text-xs font-mono`}>
            {shortenAddress(resolvedAddress, 6)}
          </p>

          {profile.socials.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              {profile.socials.map((social) => {
                const config = SOCIAL_PLATFORMS.find((p) => p.platform === social.platform);
                if (!config) return null;
                return (
                  <a
                    key={social.platform}
                    href={getSocialUrl(social.platform, social.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-10 h-10 rounded-full ${theme.colors.card} ${theme.colors.border} border flex items-center justify-center ${theme.colors.textMuted} hover:${theme.colors.accent} transition-colors`}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d={config.icon} />
                    </svg>
                  </a>
                );
              })}
            </div>
          )}

          <div className={`mt-6 flex items-center justify-center gap-4 text-sm ${theme.colors.textMuted}`}>
            <span>{profile.views || 0} views</span>
            <span className="w-1 h-1 bg-current rounded-full opacity-30" />
            <span>{products.reduce((acc, p) => acc + p.soldCount, 0)} buyers</span>
            <span className="w-1 h-1 bg-current rounded-full opacity-30" />
            <span>${(profile.totalEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} earned</span>
          </div>

          <div className="mt-8 relative" ref={shareRef}>
            <button
              onClick={() => setShowShare(!showShare)}
              className={`inline-flex items-center gap-2 px-8 py-2.5 rounded-full border ${theme.colors.border} ${theme.colors.card} ${theme.colors.text} hover:bg-white/5 transition-all active:scale-95`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="font-medium">Share</span>
            </button>

            {showShare && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 z-20 w-screen max-w-md px-4">
                <ShareMenu 
                  url={window.location.href} 
                  title={`Check out ${profile.displayName}'s store on Jynk!`} 
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {products.length === 0 ? (
            <div className={`${theme.colors.card} ${theme.colors.border} border rounded-2xl p-8 text-center`}>
              <p className={theme.colors.textMuted}>No products yet</p>
            </div>
          ) : (
            <>
              <p className={`text-xs ${theme.colors.textMuted} uppercase tracking-wider px-1 mb-4`}>
                Products
              </p>
              {products.filter(p => p.isActive).map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    if (product.price === 0) {
                      window.open(product.targetUrl, '_blank');
                    } else {
                      setSelectedProduct(product);
                    }
                  }}
                  className={`block w-full text-left ${theme.colors.card} ${theme.colors.cardHover} ${theme.colors.border} hover:border-opacity-60 border rounded-2xl p-4 transition-all group`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className={`font-medium ${theme.colors.text} truncate group-hover:${theme.colors.accent} transition-colors`}>
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className={`text-sm ${theme.colors.textMuted} truncate mt-0.5`}>
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`${theme.colors.accent} font-bold`}>
                        {product.price === 0 ? 'Free' : formatUSDC(product.price)}
                      </span>
                      <div className={`w-8 h-8 ${theme.colors.card} group-hover:bg-white/20 rounded-full flex items-center justify-center transition-colors`}>
                        <svg className={`w-4 h-4 ${theme.colors.textMuted} group-hover:text-white transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        <div className={`mt-12 pt-6 border-t border-slate-800/50 text-center`}>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 text-sm transition-colors"
          >
            <span>Create your own store</span>
            <span className={`text-xs ${theme.colors.accent}`}>Jynk</span>
          </Link>
        </div>
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
