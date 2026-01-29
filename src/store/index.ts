import { create } from 'zustand';
import type { Product, Creator, WalletType, StoreProfile } from '../types';
import { DEFAULT_THEME } from '../config/themes';
import { ProductApi, StoreApi, UsernameApi } from '../services/api';

// Convert API product to local format
function convertProduct(apiProduct: any): Product {
  return {
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
}

// Convert API profile to local format
function convertProfile(apiProfile: any, address: string): StoreProfile {
  console.log('convertProfile called with:', apiProfile, 'address:', address);
  if (!apiProfile) {
    console.warn('convertProfile received null/undefined apiProfile');
    return {
      username: address.slice(2, 8).toLowerCase(),
      displayName: undefined,
      bio: '',
      theme: DEFAULT_THEME,
      socials: [],
      views: 0,
      totalEarned: 0,
    };
  }
  return {
    username: apiProfile.username || apiProfile.display_name?.replace(/^@/, '') || address.slice(2, 8).toLowerCase(),
    displayName: apiProfile.display_name || undefined,
    bio: apiProfile.bio || '',
    avatar: apiProfile.avatar || undefined,
    theme: apiProfile.theme || DEFAULT_THEME,
    socials: apiProfile.socials?.map((s: any) => ({
      platform: s.platform,
      url: s.url,
    })) || [],
    views: apiProfile.views || 0,
    totalEarned: apiProfile.total_earned || 0,
  };
}

interface AppState {
  currentUser: Creator | null;
  walletType: WalletType | null;
  
  // Actions
  setCurrentUser: (user: Creator | null) => void;
  setWalletType: (type: WalletType | null) => void;
  
  // Products
  fetchProducts: (address: string, includeInactive?: boolean) => Promise<Product[]>;
  createProduct: (product: Omit<Product, 'createdAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Store
  fetchStore: (addressOrUsername: string) => Promise<{ profile: StoreProfile; products: Product[] } | null>;
  updateStoreProfile: (address: string, profile: Partial<StoreProfile>) => Promise<void>;
  incrementViews: (address: string) => Promise<void>;
  
  // Username
  checkUsername: (username: string) => Promise<{ available: boolean }>;
  claimUsername: (address: string, username: string) => Promise<boolean>;
}

export const useStore = create<AppState>()((set) => ({
  currentUser: null,
  walletType: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  setWalletType: (type) => set({ walletType: type }),

  // Products
  fetchProducts: async (address: string, includeInactive = false) => {
    const response = await ProductApi.getByCreator(address, includeInactive);
    if (response.success && response.data) {
      return response.data.map(convertProduct);
    }
    return [];
  },

  createProduct: async (product) => {
    const response = await ProductApi.create(product);
    if (response.success && response.data) {
      return { ...product, createdAt: Date.now() };
    }
    throw new Error(response.error || 'Failed to create product');
  },

  updateProduct: async (id, updates) => {
    await ProductApi.update(id, {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      isActive: updates.isActive,
    });
  },

  deleteProduct: async (id) => {
    await ProductApi.delete(id);
  },

  // Store
  fetchStore: async (addressOrUsername) => {
    console.log('fetchStore called with:', addressOrUsername);
    if (!addressOrUsername) {
      console.warn('fetchStore: addressOrUsername is empty');
      return null;
    }
    
    // Directly call the backend which now handles both username and address
    console.log('Calling StoreApi.get with:', addressOrUsername);
    const response = await StoreApi.get(addressOrUsername);
    console.log('storeResponse:', response);
    if (response.success && response.data && !(response.data as any).error) {
      // Get the actual address from response if available, otherwise use input
      const actualAddress = (response.data as any).address || addressOrUsername;
      const profile = convertProfile(response.data, actualAddress);
      const products = (response.data.products || []).map(convertProduct);
      return { profile, products };
    }
    return null;
  },

  updateStoreProfile: async (address, profile) => {
    await StoreApi.update(address, {
      displayName: profile.displayName,
      bio: profile.bio,
      avatar: profile.avatar,
      theme: profile.theme,
      socials: profile.socials,
    });
  },

  incrementViews: async (address) => {
    await StoreApi.incrementViews(address);
  },

  // Username
  checkUsername: async (username) => {
    console.log('Store checkUsername called with:', username);
    const response = await UsernameApi.check(username);
    console.log('Username check response:', response);
    if (response.success && response.data) {
      // Use 'taken' field if available, otherwise fall back to 'available'
      const isTaken = response.data.taken !== undefined 
        ? response.data.taken 
        : !response.data.available;
      console.log('isTaken:', isTaken, 'returning available:', !isTaken);
      return { available: !isTaken };
    }
    console.log('Response failed or no data, returning available: false');
    return { available: false };
  },

  claimUsername: async (address, username) => {
    const response = await UsernameApi.claim(address, username);
    return response.success;
  },
}));
