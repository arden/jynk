import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// Use reliable RPC endpoints with fallback
// Primary: Helius (free tier available)
// Fallback: Public RPC endpoints
const getRpcEndpoint = () => {
  // If user provided custom RPC, use it
  if (import.meta.env.VITE_SOLANA_RPC) {
    return import.meta.env.VITE_SOLANA_RPC;
  }
  
  // Use Helius free endpoints as default (more reliable than public RPC)
  if (SOLANA_NETWORK === 'mainnet-beta') {
    // Try Helius mainnet free endpoint first
    return 'https://mainnet.helius-rpc.com/?api-key=c112f7b2-2bfb-4762-a6e2-4940f85cc2cb';
  }
  
  // Devnet - use Helius devnet
  return 'https://mainnet.helius-rpc.com/?api-key=c112f7b2-2bfb-4762-a6e2-4940f85cc2cb';
};

export const SOLANA_RPC_ENDPOINT = getRpcEndpoint();

export const USDC_MINT = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

export const USDC_DECIMALS = 6;

export const getUsdcMint = () => {
  return SOLANA_NETWORK === 'mainnet-beta' ? USDC_MINT.mainnet : USDC_MINT.devnet;
};

export const getSolanaConnection = () => {
  return new Connection(SOLANA_RPC_ENDPOINT, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
};

// Fallback connection using public RPC if primary fails
export const getFallbackConnection = () => {
  const fallbackEndpoint = clusterApiUrl(SOLANA_NETWORK as 'devnet' | 'mainnet-beta');
  return new Connection(fallbackEndpoint, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
};
