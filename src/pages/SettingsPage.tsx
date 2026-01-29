import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useStore } from '../store';
import { THEMES } from '../config/themes';
import { SOCIAL_PLATFORMS } from '../config/socials';
import { StorePreview } from '../components/StorePreview';
import { generateId, encryptUrl, isValidUrl, formatUSDC } from '../utils';
import type { ThemeId, SocialLink, Product } from '../types';

type TabType = 'profile' | 'products' | 'theme' | 'socials';
type PricingType = 'free' | 'paid';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pricingType, setPricingType] = useState<PricingType>('paid');
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    targetUrl: '',
    price: '',
    isActive: true,
  });
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [updatingProduct, setUpdatingProduct] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Settings: creatorAddress changed:', creatorAddress);
    const loadData = async () => {
      if (creatorAddress) {
        setLoading(true);
        try {
          console.log('Settings: Loading data for address:', creatorAddress);
          const storeData = await store.fetchStore(creatorAddress);
          console.log('Settings: Store data received:', storeData);
          if (storeData) {
            // Use username for the username field, displayName for display name
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
          
          const prods = await store.fetchProducts(creatorAddress, true); // Include inactive for management
          console.log('Settings: Products received:', prods);
          setProducts(prods);
        } catch (error) {
          console.error('Failed to load store data:', error);
        }
        setLoading(false);
      }
    };
    loadData();
  }, [creatorAddress]);

  if (!solanaConnected) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Store Settings</h1>
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Solana Wallet</h2>
          <p className="text-slate-400 mb-6">Please connect your Solana wallet to customize your store.</p>
          <div className="solana-wallet-wrapper flex justify-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Loading...</p>
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

    await store.updateStoreProfile(creatorAddress, {
      displayName,
      bio,
      avatar,
      theme,
      socials: socialLinks,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
      const result = event.target?.result as string;
      setAvatar(result);
    };
    reader.readAsDataURL(file);
  };

  const updateSocial = (platform: string, value: string) => {
    setSocials(prev => ({ ...prev, [platform]: value }));
  };

  const validateProduct = () => {
    const errors: Record<string, string> = {};
    if (!productForm.name.trim()) errors.name = 'Name is required';
    if (!productForm.targetUrl.trim()) errors.targetUrl = 'URL is required';
    else if (!isValidUrl(productForm.targetUrl)) errors.targetUrl = 'Invalid URL format';
    if (pricingType === 'paid' && (!productForm.price || parseFloat(productForm.price) <= 0)) {
      errors.price = 'Price must be greater than 0';
    }
    setProductErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateProduct = async () => {
    if (!validateProduct()) return;
    if (!creatorAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setCreatingProduct(true);
    try {
      const product = {
        id: generateId(),
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: pricingType === 'free' ? 0 : parseFloat(productForm.price),
        targetUrl: productForm.targetUrl.trim(),
        encryptedUrl: encryptUrl(productForm.targetUrl.trim()),
        creatorAddress,
        createdAt: Date.now(),
        soldCount: 0,
        isActive: productForm.isActive,
      };

      await store.createProduct(product);
      const newProds = await store.fetchProducts(creatorAddress, true);
      setProducts(newProds);
      setProductForm({ name: '', description: '', targetUrl: '', price: '', isActive: true });
      setPricingType('paid');
      setShowProductForm(false);
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await store.deleteProduct(productId);
      const newProds = await store.fetchProducts(creatorAddress, true);
      setProducts(newProds);
    }
  };

  const handleToggleProductStatus = async (product: Product) => {
    try {
      await store.updateProduct(product.id, { isActive: !product.isActive });
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isActive: !p.isActive } : p
      ));
    } catch (error) {
      console.error('Failed to toggle product status:', error);
      alert('Failed to update product status');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description || '',
      targetUrl: product.targetUrl,
      price: product.price > 0 ? product.price.toString() : '',
      isActive: product.isActive,
    });
    setPricingType(product.price === 0 ? 'free' : 'paid');
    setShowProductForm(true);
  };

  const handleUpdateProduct = async () => {
    if (!validateProduct() || !editingProductId) return;

    setUpdatingProduct(true);
    try {
      await store.updateProduct(editingProductId, {
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: pricingType === 'free' ? 0 : parseFloat(productForm.price),
        isActive: productForm.isActive,
      });
      const newProds = await store.fetchProducts(creatorAddress, true);
      setProducts(newProds);
      setProductForm({ name: '', description: '', targetUrl: '', price: '', isActive: true });
      setPricingType('paid');
      setShowProductForm(false);
      setEditingProductId(null);
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleCancelEdit = () => {
    setShowProductForm(false);
    setEditingProductId(null);
    setProductForm({ name: '', description: '', targetUrl: '', price: '', isActive: true });
    setPricingType('paid');
    setProductErrors({});
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'products', label: 'Products' },
    { id: 'theme', label: 'Theme' },
    { id: 'socials', label: 'Socials' },
  ];

  const defaultName = `@${creatorAddress.slice(2, 8).toLowerCase()}`;
  const storeUrl = displayName && displayName !== defaultName
    ? `/s/${displayName.replace(/^@/, '')}`
    : `/s/${creatorAddress}`;

  return (
    <div className="flex gap-8 max-w-6xl mx-auto">
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

        <div className="flex border-b border-slate-800 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
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
              <label className="block text-sm font-medium mb-3 self-start">Avatar</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-24 h-24 rounded-full cursor-pointer group"
              >
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt="Avatar" 
                    className="w-full h-full rounded-full object-cover"
                  />
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <p className="text-xs text-slate-500 mt-2">Click to upload (max 2MB)</p>
              {avatar && (
                <button
                  onClick={() => setAvatar(undefined)}
                  className="text-xs text-red-400 hover:text-red-300 mt-1"
                >
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">Manage your products and create new ones.</p>
              {!showProductForm && (
                <button
                  onClick={() => {
                    setEditingProductId(null);
                    setProductForm({ name: '', description: '', targetUrl: '', price: '', isActive: true });
                    setPricingType('paid');
                    setShowProductForm(true);
                  }}
                  className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Product
                </button>
              )}
            </div>

            {showProductForm && (
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{editingProductId ? 'Edit Product' : 'New Product'}</h3>
                  <button
                    onClick={handleCancelEdit}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Product Name *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Premium API Access"
                  />
                  {productErrors.name && <p className="text-red-400 text-sm mt-1">{productErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="input-field min-h-[80px] resize-none"
                    placeholder="Describe what buyers will get..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Target URL {editingProductId ? '' : '*'}
                  </label>
                  <input
                    type="url"
                    value={productForm.targetUrl}
                    onChange={(e) => setProductForm({ ...productForm, targetUrl: e.target.value })}
                    className="input-field"
                    placeholder="https://drive.google.com..."
                    disabled={!!editingProductId}
                    title={editingProductId ? 'Target URL cannot be changed after creation' : ''}
                  />
                  {editingProductId && (
                    <p className="text-slate-500 text-xs mt-1">Target URL cannot be changed after creation</p>
                  )}
                  {productErrors.targetUrl && <p className="text-red-400 text-sm mt-1">{productErrors.targetUrl}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Pricing</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPricingType('free')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                        pricingType === 'free'
                          ? 'border-primary-500 bg-primary-500/10 text-white'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingType('paid')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                        pricingType === 'paid'
                          ? 'border-primary-500 bg-primary-500/10 text-white'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Paid
                    </button>
                  </div>
                </div>

                {pricingType === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Price (USDC) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="input-field"
                      placeholder="9.99"
                    />
                    {productErrors.price && <p className="text-red-400 text-sm mt-1">{productErrors.price}</p>}
                  </div>
                )}

                {/* Product Status Toggle */}
                <div className="flex items-center justify-between py-3 border-t border-slate-700">
                  <div>
                    <p className="text-sm font-medium">Product Status</p>
                    <p className="text-xs text-slate-500">
                      {productForm.isActive ? 'Active - visible in your store' : 'Inactive - hidden from your store'}
                    </p>
                  </div>
                  <button
                    onClick={() => setProductForm({ ...productForm, isActive: !productForm.isActive })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${productForm.isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${productForm.isActive ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button
                  onClick={editingProductId ? handleUpdateProduct : handleCreateProduct}
                  disabled={creatingProduct || updatingProduct}
                  className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {creatingProduct || updatingProduct ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {editingProductId ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    editingProductId ? 'Save Changes' : 'Create Product'
                  )}
                </button>
              </div>
            )}

            {products.length === 0 && !showProductForm ? (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p>No products yet</p>
                <button
                  onClick={() => setShowProductForm(true)}
                  className="mt-3 text-primary-400 hover:text-primary-300 text-sm"
                >
                  Create your first product
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium">{product.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {product.soldCount}
                          </span>
                          <span>{product.soldCount} sales</span>
                          <span className="text-lime-400">{product.price === 0 ? 'Free' : formatUSDC(product.price)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleProductStatus(product)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${product.isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${product.isActive ? 'left-7' : 'left-1'}`} />
                      </button>
                      
                      {/* Copy Link */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/p/${product.id}`);
                          alert('Product link copied!');
                        }}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy link"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {/* Edit */}
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                        title="Edit product"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete product"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

        {/* Fixed Save Bar - Only show on non-products tabs, or on products tab when not adding/editing a product */}
        {(!showProductForm || activeTab !== 'products') && (
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

      {/* Live Preview */}
      <div className="hidden lg:block w-[380px] flex-shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">Live Preview</h3>
            <Link
              to={storeUrl}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
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
