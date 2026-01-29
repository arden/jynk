import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';

export const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
export const SOLANA_RPC_ENDPOINT = import.meta.env.VITE_SOLANA_RPC || clusterApiUrl(SOLANA_NETWORK as 'devnet' | 'mainnet-beta');

export const USDC_MINT = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
};

export const USDC_DECIMALS = 6;

export const getUsdcMint = () => {
  return SOLANA_NETWORK === 'mainnet-beta' ? USDC_MINT.mainnet : USDC_MINT.devnet;
};

export const getSolanaConnection = () => new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
