import { baseSepolia, base } from 'viem/chains';
import type { X402PaymentPayload } from '../types/index.js';
import { 
  getProductById, 
  addPurchase, 
  updateProductSales 
} from '../db/index.js';

const CONFIG = {
  base: {
    chain: base,
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  },
  baseSepolia: {
    chain: baseSepolia,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const,
  },
};

export class X402Service {
  static decodePaymentPayload(encoded: string): X402PaymentPayload {
    try {
      return JSON.parse(atob(encoded));
    } catch {
      throw new Error('Invalid x402 payment payload');
    }
  }

  static async verifyPayment(
    productId: string,
    paymentPayload: string,
    buyerAddress: string
  ) {
    const payload = this.decodePaymentPayload(paymentPayload);
    const product = await getProductById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Generate transaction hash from signature
    const txHash = `0x${Buffer.from(payload.payload.signature).toString('hex').slice(0, 64)}`;
    const network = payload.network.startsWith('eip155:8453') ? 'base' : 'baseSepolia';

    // Record purchase
    const purchaseId = `${txHash}_${Date.now()}`;
    await addPurchase({
      id: purchaseId,
      productId,
      buyerAddress,
      txHash,
      network,
      amount: product.price,
    });

    await updateProductSales(productId);

    return {
      txHash,
      unlockedContent: product.target_url,
    };
  }

  static async verifyDirectPayment(
    productId: string,
    txHash: string,
    network: 'base' | 'solana',
    buyerAddress: string
  ) {
    const product = await getProductById(productId);
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Record purchase
    const purchaseId = `${txHash}_${Date.now()}`;
    await addPurchase({
      id: purchaseId,
      productId,
      buyerAddress,
      txHash,
      network,
      amount: product.price,
    });

    await updateProductSales(productId);

    return {
      txHash,
      unlockedContent: product.target_url,
    };
  }
}
