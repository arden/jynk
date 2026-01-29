import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { formatUSDC } from '../utils';

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
  onDelete?: (id: string) => void;
}

export function ProductCard({ product, showActions, onDelete }: ProductCardProps) {
  return (
    <div className="card hover:border-slate-600 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
        <span className="text-primary-400 font-bold">{formatUSDC(product.price)}</span>
      </div>
      
      <p className="text-slate-400 text-sm line-clamp-2 mb-4">{product.description}</p>
      
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{product.soldCount} sold</span>
        {product.maxQuantity && (
          <span>{product.maxQuantity - product.soldCount} left</span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
        <Link 
          to={`/p/${product.id}`}
          className="btn-primary flex-1 text-center text-sm py-2"
        >
          View
        </Link>
        {showActions && (
          <>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/p/${product.id}`)}
              className="btn-secondary text-sm py-2 px-3"
              title="Copy link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(product.id)}
                className="btn-secondary text-sm py-2 px-3 text-red-400 hover:text-red-300"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
