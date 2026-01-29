export const X402_CONFIG = {
  facilitatorUrl: import.meta.env.VITE_X402_FACILITATOR_URL || 'https://x402.org/facilitator',
  supportedNetworks: {
    base: 'eip155:8453',
    baseSepolia: 'eip155:84532',
    solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    solanaDevnet: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  },
  usdc: {
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    baseSepolia: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
};

export interface PaymentRequiredHeader {
  x402Version: number;
  accepts: PaymentAccept[];
  error?: string;
}

export interface PaymentAccept {
  scheme: 'exact';
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, unknown>;
}

export interface PaymentPayload {
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

export function encodePaymentRequired(
  payTo: string,
  amount: string,
  network: string,
  resource: string,
  asset: string
): string {
  const header: PaymentRequiredHeader = {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network,
        maxAmountRequired: amount,
        resource,
        payTo,
        maxTimeoutSeconds: 300,
        asset,
      },
    ],
  };
  return btoa(JSON.stringify(header));
}

export function decodePaymentRequired(encoded: string): PaymentRequiredHeader {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    throw new Error('Invalid Payment-Required header');
  }
}

export function createPaymentPayload(
  network: string,
  signature: string,
  from: string,
  to: string,
  value: string,
  nonce: string
): string {
  const payload: PaymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network,
    payload: {
      signature,
      authorization: {
        from,
        to,
        value,
        validAfter: '0',
        validBefore: Math.floor(Date.now() / 1000 + 300).toString(),
        nonce,
      },
    },
  };
  return btoa(JSON.stringify(payload));
}
