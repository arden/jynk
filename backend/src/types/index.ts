// Database types matching frontend types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  target_url: string;
  encrypted_url: string;
  creator_address: string;
  created_at: number;
  sold_count: number;
  max_quantity: number | null;
  is_active: number;
}

export interface StoreProfile {
  address: string;
  display_name: string;
  bio: string;
  avatar: string | null;
  theme: string;
  views: number;
  total_earned: number;
  created_at: number;
  updated_at: number;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Purchase {
  id: string;
  product_id: string;
  buyer_address: string;
  tx_hash: string;
  network: 'base' | 'solana';
  amount: number;
  created_at: number;
}

export interface User {
  id: string;
  address: string;
  wallet_type: 'evm' | 'solana';
  created_at: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Payment types
export interface PaymentVerificationRequest {
  productId: string;
  payment: string; // x402 payment payload
}

export interface PaymentVerificationResponse {
  txHash: string;
  unlockedContent: string;
}

// x402 types
export interface X402PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: string;
  payload: {
    signature: string;
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}
