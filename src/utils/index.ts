export const generateId = () => {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

export const shortenAddress = (address: string, chars = 4) => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const formatUSDC = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const encryptUrl = (url: string): string => {
  try {
    const encoded = btoa(url);
    const obfuscated = encoded.split('').reverse().join('');
    const withPrefix = `jynk_${obfuscated}`;
    return btoa(withPrefix);
  } catch {
    return btoa(url);
  }
};

export const decryptUrl = (encrypted: string): string => {
  try {
    const decoded = atob(encrypted);
    if (!decoded.startsWith('jynk_')) {
      return atob(encrypted);
    }
    const obfuscated = decoded.replace('jynk_', '');
    const encoded = obfuscated.split('').reverse().join('');
    return atob(encoded);
  } catch {
    return '';
  }
};

export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
