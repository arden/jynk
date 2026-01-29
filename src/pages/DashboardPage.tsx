import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useStore } from '../store';
import { EditProductModal } from '../components/EditProductModal';
import { shortenAddress, formatUSDC } from '../utils';
import type { Product, StoreProfile } from '../types';

export function DashboardPage() {
  const { publicKey: solanaKey, connected: solanaConnected } = useWallet();
  const store = useStore();

  const creatorAddress = solanaKey?.toBase58() || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (creatorAddress) {
        setLoading(true);
        try {
          const [prods, storeData] = await Promise.all([
            store.fetchProducts(creatorAddress, true), // Include inactive products for management
            store.fetchStore(creatorAddress),
          ]);
          setProducts(prods);
          if (storeData) {
            setProfile(storeData.profile);
          }
        } catch (error) {
          console.error('Failed to load dashboard data:', error);
        }
        setLoading(false);
      }
    };
    loadData();
  }, [creatorAddress, store]);

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await store.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
  };

  const handleToggleActive = async (product: Product) => {
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
    setEditingProduct(product);
  };

  const handleSaveProduct = async (productId: string, updates: Partial<Product>) => {
    await store.updateProduct(productId, updates);
    // Refresh products list
    const prods = await store.fetchProducts(creatorAddress, true);
    setProducts(prods);
  };

  const handleCopyLink = () => {
    const storeUrl = profile?.displayName 
      ? `${window.location.origin}/s/${profile.displayName.replace(/^@/, '')}`
      : `${window.location.origin}/s/${creatorAddress}`;
    navigator.clipboard.writeText(storeUrl);
    alert('Store link copied to clipboard!');
  };

  const totalEarnings = products.reduce((sum, p) => sum + (p.price * p.soldCount), 0);
  const totalViews = profile?.views || 0;

  const displayName = profile?.displayName || shortenAddress(creatorAddress, 6);
  const username = profile?.displayName?.replace(/^@/, '') || shortenAddress(creatorAddress, 6);
  const avatarLetter = displayName.charAt(0).toUpperCase();

  if (!solanaConnected) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Dashboard</h1>
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Solana Wallet</h2>
          <p className="text-slate-400 mb-6">Please connect your Solana wallet to view your dashboard.</p>
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

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p className="text-slate-400">Manage your links and store</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/settings" 
            className="px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Store
          </Link>
          <Link 
            to="/create" 
            className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Link
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Total Links</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Public Links</p>
          <p className="text-2xl font-bold text-cyan-400">{products.filter(p => p.isActive).length}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Total Views</p>
          <p className="text-2xl font-bold">{totalViews}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-500 text-sm mb-1">Balance</p>
          <p className="text-2xl font-bold text-lime-400">{formatUSDC(totalEarnings)}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-slate-900 font-bold text-xl">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                avatarLetter
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{displayName}</h2>
              <p className="text-slate-500 text-sm">@{username}</p>
              {profile?.bio && (
                <p className="text-slate-400 text-sm mt-1 line-clamp-1">{profile.bio}</p>
              )}
            </div>
          </div>
          <Link 
            to={`/s/${username}`}
            className="px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            View Store
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
        
        {/* Store Link */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-slate-400 text-sm">{window.location.origin}/s/{username}</span>
          <button 
            onClick={handleCopyLink}
            className="text-cyan-400 text-sm font-medium hover:text-cyan-300 transition-colors"
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* Products Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Links</h2>
          <span className="text-slate-500 text-sm">{products.length} links</span>
        </div>

        {products.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center">
            <p className="text-slate-400 mb-4">You haven't created any products yet.</p>
            <Link to="/create" className="btn-primary">Create Your First Product</Link>
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
                    onClick={() => handleToggleActive(product)}
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

      {/* Edit Product Modal */}
      <EditProductModal
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
