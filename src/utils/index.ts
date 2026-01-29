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
  return btoa(url);
};

export const decryptUrl = (encrypted: string): string => {
  return atob(encrypted);
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
