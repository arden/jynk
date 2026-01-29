import { useState, useEffect } from 'react';
import type { Product } from '../types';
import { formatUSDC } from '../utils';

interface EditProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (productId: string, updates: Partial<Product>) => Promise<void>;
}

type PricingType = 'free' | 'paid';

export function EditProductModal({ product, isOpen, onClose, onSave }: EditProductModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricingType, setPricingType] = useState<PricingType>('paid');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || '');
      setPrice(product.price > 0 ? product.price.toString() : '');
      setPricingType(product.price === 0 ? 'free' : 'paid');
      setIsActive(product.isActive);
      setErrors({});
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (pricingType === 'paid') {
      const priceNum = parseFloat(price);
      if (!price || isNaN(priceNum) || priceNum <= 0) {
        newErrors.price = 'Price must be greater than 0';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave(product.id, {
        name: name.trim(),
        description: description.trim(),
        price: pricingType === 'free' ? 0 : parseFloat(price),
        isActive,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold">Edit Product</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="e.g., Premium API Access"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 transition-colors min-h-[80px] resize-none"
              placeholder="Describe what buyers will get..."
            />
          </div>
          
          {/* Target URL (Read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">Target URL</label>
            <input
              type="url"
              value={product.targetUrl}
              disabled
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
            />
            <p className="text-slate-500 text-xs mt-1">Target URL cannot be changed after creation</p>
          </div>
          
          {/* Pricing Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Pricing</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPricingType('free')}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                  pricingType === 'free'
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
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
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                Paid
              </button>
            </div>
          </div>
          
          {/* Price */}
          {pricingType === 'paid' && (
            <div>
              <label className="block text-sm font-medium mb-2">Price (USDC) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                placeholder="9.99"
              />
              {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
            </div>
          )}
          
          {/* Active Status */}
          <div className="flex items-center justify-between py-3 border-t border-slate-800">
            <div>
              <p className="font-medium">Product Status</p>
              <p className="text-sm text-slate-500">
                {isActive ? 'Active - visible in your store' : 'Inactive - hidden from your store'}
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isActive ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 py-3 border-t border-slate-800">
            <div>
              <p className="text-sm text-slate-500">Sales</p>
              <p className="text-lg font-semibold">{product.soldCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Revenue</p>
              <p className="text-lg font-semibold text-lime-400">{formatUSDC(product.price * product.soldCount)}</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
