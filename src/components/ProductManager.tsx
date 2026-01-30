import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useStore } from '../store';
import { generateId, encryptUrl, isValidUrl, formatUSDC } from '../utils';
import type { Product } from '../types';

interface ProductManagerProps {
  products: Product[];
  onProductsChange: (products: Product[]) => void;
}

type PricingType = 'free' | 'paid';

export function ProductManager({ products, onProductsChange }: ProductManagerProps) {
  const { publicKey: solanaKey } = useWallet();
  const store = useStore();
  const creatorAddress = solanaKey?.toBase58() || '';

  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pricingType, setPricingType] = useState<PricingType>('paid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    targetUrl: '',
    price: '',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required';
    if (!form.targetUrl.trim()) newErrors.targetUrl = 'URL is required';
    else if (!isValidUrl(form.targetUrl)) newErrors.targetUrl = 'Invalid URL format';
    if (pricingType === 'paid' && (!form.price || parseFloat(form.price) <= 0)) {
      newErrors.price = 'Price must be greater than 0';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setForm({ name: '', description: '', targetUrl: '', price: '', isActive: true });
    setPricingType('paid');
    setErrors({});
    setEditingProductId(null);
  };

  const handleCreate = async () => {
    if (!validate() || !creatorAddress) return;

    setIsSubmitting(true);
    try {
      const product: Omit<Product, 'createdAt'> = {
        id: generateId(),
        name: form.name.trim(),
        description: form.description.trim(),
        price: pricingType === 'free' ? 0 : parseFloat(form.price),
        targetUrl: form.targetUrl.trim(),
        encryptedUrl: encryptUrl(form.targetUrl.trim()),
        creatorAddress,
        soldCount: 0,
        isActive: form.isActive,
      };

      await store.createProduct(product);
      const newProds = await store.fetchProducts(creatorAddress, true);
      onProductsChange(newProds);
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!validate() || !editingProductId) return;

    setIsSubmitting(true);
    try {
      await store.updateProduct(editingProductId, {
        name: form.name.trim(),
        description: form.description.trim(),
        price: pricingType === 'free' ? 0 : parseFloat(form.price),
        isActive: form.isActive,
      });
      const newProds = await store.fetchProducts(creatorAddress, true);
      onProductsChange(newProds);
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await store.deleteProduct(productId);
      const newProds = await store.fetchProducts(creatorAddress, true);
      onProductsChange(newProds);
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      await store.updateProduct(product.id, { isActive: !product.isActive });
      onProductsChange(products.map(p =>
        p.id === product.id ? { ...p, isActive: !p.isActive } : p
      ));
    } catch (error) {
      console.error('Failed to toggle status:', error);
      alert('Failed to update product status');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      description: product.description || '',
      targetUrl: product.targetUrl,
      price: product.price > 0 ? product.price.toString() : '',
      isActive: product.isActive,
    });
    setPricingType(product.price === 0 ? 'free' : 'paid');
    setShowForm(true);
  };

  const handleCopyLink = (productId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/p/${productId}`);
    alert('Product link copied!');
  };

  if (showForm) {
    return (
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{editingProductId ? 'Edit Product' : 'New Product'}</h3>
          <button
            onClick={() => { resetForm(); setShowForm(false); }}
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
            value={form.targetUrl}
            onChange={(e) => setForm({ ...form, targetUrl: e.target.value })}
            className="input-field"
            placeholder="https://drive.google.com..."
            disabled={!!editingProductId}
          />
          {editingProductId && (
            <p className="text-slate-500 text-xs mt-1">Target URL cannot be changed after creation</p>
          )}
          {errors.targetUrl && <p className="text-red-400 text-sm mt-1">{errors.targetUrl}</p>}
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
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="input-field"
              placeholder="9.99"
            />
            {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
          </div>
        )}

        <div className="flex items-center justify-between py-3 border-t border-slate-700">
          <div>
            <p className="text-sm font-medium">Product Status</p>
            <p className="text-xs text-slate-500">
              {form.isActive ? 'Active - visible in your store' : 'Inactive - hidden from your store'}
            </p>
          </div>
          <button
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
            className={`w-12 h-6 rounded-full transition-colors relative ${form.isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <button
          onClick={editingProductId ? handleUpdate : handleCreate}
          disabled={isSubmitting}
          className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Manage your products and create new ones.</p>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700 border-dashed">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-slate-500 mb-2">No products yet</p>
          <p className="text-slate-600 text-sm mb-4">Create your first product to start selling</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary text-sm"
          >
            Create Product
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
                <button
                  onClick={() => handleToggleStatus(product)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${product.isActive ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${product.isActive ? 'left-7' : 'left-1'}`} />
                </button>
                
                <button
                  onClick={() => handleCopyLink(product.id)}
                  className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Copy link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleEdit(product)}
                  className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Edit product"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleDelete(product.id)}
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
  );
}
