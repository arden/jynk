// x402 Protocol Utility Functions

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

/**
 * Encode payment required header to base64
 */
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

/**
 * Decode payment required header from base64
 */
export function decodePaymentRequired(encoded: string): PaymentRequiredHeader {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    throw new Error('Invalid Payment-Required header');
  }
}

/**
 * Create x402 payment payload
 */
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

/**
 * Decode x402 payment payload
 */
export function decodePaymentPayload(encoded: string): PaymentPayload {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    throw new Error('Invalid x402 payment payload');
  }
}
