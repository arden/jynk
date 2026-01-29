import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { PaymentWalletModal } from '../components/PaymentWalletModal';
import { formatUSDC, shortenAddress } from '../utils';
import { API_BASE_URL } from '../services/api';
import type { Product, StoreProfile } from '../types';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const { } = useWallet();

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
        if (response.ok) {
          const data = await response.json();
          const apiProduct = data.data;
          const convertedProduct: Product = {
            id: apiProduct.id,
            name: apiProduct.name,
            description: apiProduct.description || '',
            price: apiProduct.price,
            targetUrl: apiProduct.target_url,
            encryptedUrl: apiProduct.encrypted_url,
            creatorAddress: apiProduct.creator_address,
            createdAt: apiProduct.created_at,
            soldCount: apiProduct.sold_count || 0,
            maxQuantity: apiProduct.max_quantity || undefined,
            isActive: apiProduct.is_active,
          };
          setProduct(convertedProduct);
          
          try {
            const storeResponse = await fetch(`${API_BASE_URL}/api/stores/${apiProduct.creator_address}`);
            if (storeResponse.ok) {
              const storeData = await storeResponse.json();
              if (storeData.success && storeData.data) {
                setCreatorProfile({
                  displayName: storeData.data.display_name || shortenAddress(apiProduct.creator_address, 6),
                  bio: storeData.data.bio || '',
                  avatar: storeData.data.avatar,
                  theme: storeData.data.theme || 'midnight',
                  socials: storeData.data.socials || [],
                  views: storeData.data.views || 0,
                  totalEarned: storeData.data.total_earned || 0,
                });
              }
            }
          } catch (err) {
            console.error('Failed to load creator profile:', err);
          }
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Failed to load product:', err);
        setError('Failed to load product');
      }
      
      setLoading(false);
    };
    
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Product not found.</p>
          <Link to="/" className="text-primary-400 hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  const isSoldOut = Boolean(product.maxQuantity && product.soldCount >= product.maxQuantity);
  const isFree = product.price === 0;
  
  const displayName = creatorProfile?.displayName || shortenAddress(product.creatorAddress, 6);
  const username = creatorProfile?.displayName?.replace(/^@/, '') || shortenAddress(product.creatorAddress, 6);
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handlePayClick = () => {
    if (isFree) {
      window.open(product.targetUrl, '_blank');
    } else {
      setShowPaymentModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 pt-16">
      {/* Creator Info */}
      <div className="text-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mx-auto mb-4 flex items-center justify-center text-slate-900 font-bold text-3xl shadow-lg">
          {creatorProfile?.avatar ? (
            <img src={creatorProfile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            avatarLetter
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-1">{displayName}</h2>
        <p className="text-slate-500 mb-3">@{username}</p>
        
        {creatorProfile?.bio && (
          <p className="text-slate-400 max-w-md">{creatorProfile.bio}</p>
        )}
      </div>

      {/* Product Card */}
      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-white text-center mb-3">{product.name}</h1>
        
        {product.description && (
          <p className="text-slate-400 text-center mb-6">{product.description}</p>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayClick}
          disabled={isSoldOut}
          className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-xl transition-colors"
        >
          {isSoldOut ? 'Sold Out' : isFree ? 'Get for Free' : `Pay ${formatUSDC(product.price)} USDC`}
        </button>
      </div>

      {/* View Store Link */}
      <Link 
        to={`/s/${username}`}
        className="mt-8 text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-2"
      >
        View full store
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </Link>

      {/* Payment Modal */}
      {showPaymentModal && product && (
        <PaymentWalletModal product={product} onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  );
}
