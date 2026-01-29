export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  targetUrl: string;
  encryptedUrl?: string;
  creatorAddress: string;
  createdAt: number;
  soldCount: number;
  maxQuantity?: number;
  isActive: boolean;
}

export type ThemeId = 'midnight' | 'ocean' | 'sunset' | 'forest' | 'lavender' | 'minimal';

export interface SocialLink {
  platform: SocialPlatform;
  url: string;
}

export type SocialPlatform = 
  | 'twitter'
  | 'github'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'discord'
  | 'telegram'
  | 'facebook'
  | 'twitch'
  | 'website';

export interface StoreProfile {
  username?: string;
  displayName?: string;
  bio: string;
  avatar?: string;
  theme: ThemeId;
  socials: SocialLink[];
  views: number;
  totalEarned: number;
}

export interface Creator {
  address: string;
  username?: string;
  avatar?: string;
  bio?: string;
  createdAt: number;
  profile?: StoreProfile;
}

export interface Purchase {
  id: string;
  productId: string;
  buyerAddress: string;
  txHash: string;
  network: 'base' | 'solana';
  amount: number;
  createdAt: number;
}

export type WalletType = 'evm' | 'solana';

export interface WalletState {
  connected: boolean;
  address: string | null;
  walletType: WalletType | null;
}
