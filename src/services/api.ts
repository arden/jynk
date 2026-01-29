import type { Product, StoreProfile, SocialLink } from '../types';

// API Base URL - change this to your backend URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || data.message || 'Request failed' };
    }

    // Backend returns { success: true, data: {...} }
    // We need to extract the inner data
    if (data.success && data.data !== undefined) {
      return { success: true, data: data.data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API Error:', url, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Network error' 
    };
  }
}

// Product API
export const ProductApi = {
  async getById(id: string): Promise<ApiResponse<Product>> {
    return fetchApi<Product>(`${API_BASE_URL}/api/products/${id}`);
  },

  async getByCreator(address: string, includeInactive = false): Promise<ApiResponse<Product[]>> {
    const url = `${API_BASE_URL}/api/creators/${address}/products${includeInactive ? '?includeInactive=true' : ''}`;
    return fetchApi<Product[]>(url);
  },

  async create(product: Omit<Product, 'createdAt'>): Promise<ApiResponse<{ id: string }>> {
    return fetchApi<{ id: string }>(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      body: JSON.stringify({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        targetUrl: product.targetUrl,
        encryptedUrl: product.encryptedUrl,
        creatorAddress: product.creatorAddress,
        maxQuantity: product.maxQuantity,
      }),
    });
  },

  async update(id: string, updates: Partial<Product>): Promise<ApiResponse<{ id: string }>> {
    // Convert camelCase to snake_case for backend
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.name = updates.name;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.price !== undefined) body.price = updates.price;
    if (updates.isActive !== undefined) body.is_active = updates.isActive;
    
    return fetchApi<{ id: string }>(`${API_BASE_URL}/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    return fetchApi<{ id: string }>(`${API_BASE_URL}/api/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Store API
export const StoreApi = {
  async get(address: string): Promise<ApiResponse<StoreProfile & { socials: SocialLink[]; products: Product[] }>> {
    console.log('StoreApi.get called with address:', address);
    const url = `${API_BASE_URL}/api/stores/${encodeURIComponent(address)}`;
    console.log('StoreApi.get URL:', url);
    return fetchApi(url);
  },

  async getByUsername(username: string): Promise<ApiResponse<{ address: string }>> {
    return fetchApi(`${API_BASE_URL}/api/username/${username}`);
  },

  async update(address: string, profile: Partial<StoreProfile> & { socials?: SocialLink[] }): Promise<ApiResponse<{ address: string }>> {
    return fetchApi(`${API_BASE_URL}/api/stores/${address}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  async incrementViews(address: string): Promise<ApiResponse<unknown>> {
    return fetchApi(`${API_BASE_URL}/api/stores/${address}/views`, {
      method: 'POST',
    });
  },
};

// Username API
export const UsernameApi = {
  async check(username: string, excludeAddress?: string): Promise<ApiResponse<{ available: boolean; taken: boolean }>> {
    // Ensure username is properly encoded for URL
    const encodedUsername = encodeURIComponent(username);
    const url = excludeAddress 
      ? `${API_BASE_URL}/api/username/${encodedUsername}/check?address=${excludeAddress}`
      : `${API_BASE_URL}/api/username/${encodedUsername}/check`;
    console.log('UsernameApi.check URL:', url, 'username:', username);
    return fetchApi(url);
  },

  async claim(address: string, username: string): Promise<ApiResponse<{ username: string; storeUrl: string }>> {
    return fetchApi(`${API_BASE_URL}/api/username/claim`, {
      method: 'POST',
      body: JSON.stringify({ address, username }),
    });
  },
};

// Payment API
export const PaymentApi = {
  async verifyX402(
    productId: string,
    paymentPayload: string,
    buyerAddress: string
  ): Promise<ApiResponse<{ txHash: string; unlockedContent: string }>> {
    return fetchApi(`${API_BASE_URL}/api/x402/verify/${productId}`, {
      method: 'POST',
      headers: {
        'X-PAYMENT': paymentPayload,
        'X-BUYER-ADDRESS': buyerAddress,
      },
    });
  },

  async directPay(
    productId: string,
    txHash: string,
    network: 'base' | 'solana',
    buyerAddress: string
  ): Promise<ApiResponse<{ txHash: string; unlockedContent: string }>> {
    return fetchApi(`${API_BASE_URL}/api/pay/direct`, {
      method: 'POST',
      body: JSON.stringify({ productId, txHash, network, buyerAddress }),
    });
  },
};

// Health check
export async function checkHealth(): Promise<ApiResponse<{ status: string; database: string }>> {
  return fetchApi(`${API_BASE_URL}/health`);
}
