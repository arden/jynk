import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useStore } from '../store';
import { generateId, encryptUrl, isValidUrl } from '../utils';

type PricingType = 'free' | 'paid';

export function CreatePage() {
  const navigate = useNavigate();
  const { publicKey: solanaKey, connected: solanaConnected } = useWallet();
  const { createProduct } = useStore();

  const [pricingType, setPricingType] = useState<PricingType>('paid');
  const [form, setForm] = useState({
    name: '',
    description: '',
    targetUrl: '',
    price: '',
    limitQuantity: false,
    maxQuantity: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const creatorAddress = solanaKey?.toBase58() || '';

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.targetUrl.trim()) newErrors.targetUrl = 'URL is required';
    else if (!isValidUrl(form.targetUrl)) newErrors.targetUrl = 'Invalid URL format';
    if (pricingType === 'paid' && (!form.price || parseFloat(form.price) <= 0)) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (form.limitQuantity && (!form.maxQuantity || parseInt(form.maxQuantity) <= 0)) {
      newErrors.maxQuantity = 'Quantity must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const product = {
      id: generateId(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: pricingType === 'free' ? 0 : parseFloat(form.price),
      targetUrl: form.targetUrl.trim(),
      encryptedUrl: encryptUrl(form.targetUrl.trim()),
      creatorAddress,
      createdAt: Date.now(),
      soldCount: 0,
      maxQuantity: form.limitQuantity ? parseInt(form.maxQuantity) : undefined,
      isActive: true,
    };

    await createProduct(product);
    navigate('/dashboard');
  };

  if (!solanaConnected) {
    return (
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Create New Product</h1>
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Solana Wallet</h2>
          <p className="text-slate-400 mb-6">Please connect your Solana wallet to create products.</p>
          <div className="solana-wallet-wrapper flex justify-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Product Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-field"
            placeholder="e.g., Premium API Access"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input-field min-h-[100px]"
            placeholder="Describe what buyers will get..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Target URL *</label>
          <input
            type="url"
            value={form.targetUrl}
            onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
            className="input-field"
            placeholder="https://drive.google.com/..."
          />
          {errors.targetUrl && <p className="text-red-400 text-sm mt-1">{errors.targetUrl}</p>}
          <p className="text-slate-500 text-sm mt-1">This URL will be revealed after purchase</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Pricing</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPricingType('free')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                pricingType === 'free'
                  ? 'border-primary-500 bg-primary-500/10 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              <span className="font-medium">Free</span>
            </button>
            <button
              type="button"
              onClick={() => setPricingType('paid')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                pricingType === 'paid'
                  ? 'border-primary-500 bg-primary-500/10 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Paid</span>
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
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="input-field"
              placeholder="9.99"
            />
            {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="limitQuantity"
            checked={form.limitQuantity}
            onChange={(e) => setForm({ ...form, limitQuantity: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-primary-500 focus:ring-primary-500"
          />
          <label htmlFor="limitQuantity" className="text-sm">Limit quantity</label>
        </div>

        {form.limitQuantity && (
          <div>
            <label className="block text-sm font-medium mb-2">Max Quantity</label>
            <input
              type="number"
              min="1"
              value={form.maxQuantity}
              onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
              className="input-field"
              placeholder="100"
            />
            {errors.maxQuantity && <p className="text-red-400 text-sm mt-1">{errors.maxQuantity}</p>}
          </div>
        )}

        <div className="pt-4 flex gap-4">
          <button type="submit" className="btn-primary flex-1">
            Create Product
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
