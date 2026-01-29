import { THEMES } from '../config/themes';
import { SOCIAL_PLATFORMS, getSocialUrl } from '../config/socials';
import { shortenAddress, formatUSDC } from '../utils';
import type { ThemeId, SocialLink, Product } from '../types';

interface StorePreviewProps {
  address: string;
  displayName: string;
  bio: string;
  avatar?: string;
  theme: ThemeId;
  socials: SocialLink[];
  products: Product[];
}

export function StorePreview({
  address,
  displayName,
  bio,
  avatar,
  theme,
  socials,
  products,
}: StorePreviewProps) {
  const themeConfig = THEMES[theme];

  return (
    <div className={`h-full ${themeConfig.colors.background} rounded-2xl overflow-hidden`}>
      <div className="h-full overflow-y-auto">
        <div className="max-w-sm mx-auto px-4 py-6 scale-[0.85] origin-top">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 bg-gradient-to-br ${themeConfig.colors.avatarFrom} ${themeConfig.colors.avatarTo} rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg overflow-hidden`}>
              {avatar ? (
                <img src={avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">
                  {displayName.replace('@', '').slice(0, 2).toUpperCase() || '?'}
                </span>
              )}
            </div>
            <h1 className={`text-lg font-bold ${themeConfig.colors.text} mb-1`}>
              {displayName || '@username'}
            </h1>
            {bio && (
              <p className={`${themeConfig.colors.textMuted} text-xs mb-2 max-w-xs mx-auto`}>
                {bio}
              </p>
            )}
            <p className={`text-slate-500 text-xs font-mono`}>
              {shortenAddress(address, 4)}
            </p>

            {socials.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {socials.slice(0, 5).map((social) => {
                  const config = SOCIAL_PLATFORMS.find((p) => p.platform === social.platform);
                  if (!config) return null;
                  return (
                    <a
                      key={social.platform}
                      href={getSocialUrl(social.platform, social.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-8 h-8 rounded-full ${themeConfig.colors.card} ${themeConfig.colors.border} border flex items-center justify-center ${themeConfig.colors.textMuted} hover:${themeConfig.colors.accent} transition-colors`}
                      onClick={(e) => e.preventDefault()}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d={config.icon} />
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}

            <div className={`mt-4 flex items-center justify-center gap-3 text-[10px] ${themeConfig.colors.textMuted}`}>
              <span>144 views</span>
              <span className="w-0.5 h-0.5 bg-current rounded-full opacity-30" />
              <span>19 buyers</span>
              <span className="w-0.5 h-0.5 bg-current rounded-full opacity-30" />
              <span>$9.396 earned</span>
            </div>

            <div className="mt-4">
              <div className={`inline-flex items-center gap-1.5 px-5 py-1.5 rounded-full border ${themeConfig.colors.border} ${themeConfig.colors.card} ${themeConfig.colors.text} opacity-80 text-[11px]`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="font-medium">Share</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {products.length === 0 ? (
              <>
                <p className={`text-xs ${themeConfig.colors.textMuted} uppercase tracking-wider px-1 mb-3`}>
                  Products
                </p>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className={`${themeConfig.colors.card} ${themeConfig.colors.border} border rounded-xl p-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className={`h-4 w-24 ${themeConfig.colors.border} bg-current rounded opacity-20`} />
                        <div className={`h-3 w-32 ${themeConfig.colors.border} bg-current rounded opacity-10 mt-1`} />
                      </div>
                      <div className={`${themeConfig.colors.accent} font-bold text-sm`}>
                        $0.00
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <p className={`text-xs ${themeConfig.colors.textMuted} uppercase tracking-wider px-1 mb-3`}>
                  Products
                </p>
                {products.slice(0, 3).map((product) => (
                  <div
                    key={product.id}
                    className={`${themeConfig.colors.card} ${themeConfig.colors.border} border rounded-xl p-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-3">
                        <h3 className={`font-medium ${themeConfig.colors.text} truncate text-sm`}>
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className={`text-xs ${themeConfig.colors.textMuted} truncate mt-0.5`}>
                            {product.description}
                          </p>
                        )}
                      </div>
                      <span className={`${themeConfig.colors.accent} font-bold text-sm flex-shrink-0`}>
                        {product.price === 0 ? 'Free' : formatUSDC(product.price)}
                      </span>
                    </div>
                  </div>
                ))}
                {products.length > 3 && (
                  <p className={`text-xs ${themeConfig.colors.textMuted} text-center pt-2`}>
                    +{products.length - 3} more products
                  </p>
                )}
              </>
            )}
          </div>

          <div className={`mt-8 pt-4 border-t border-slate-800/30 text-center`}>
            <span className="inline-flex items-center gap-1.5 text-slate-600 text-xs">
              <span>Create your own store</span>
              <span className={`${themeConfig.colors.accent}`}>Jynk</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
