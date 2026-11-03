/** Card colors people can pick. The key is what gets saved. */
export const CARD_COLORS: { key: string; name: string; colors: [string, string, string?] }[] = [
  { key: 'black', name: 'Obsidian Black', colors: ['#2c2c2e', '#141416', '#09090b'] },
  { key: 'unionbank', name: 'UnionBank Sunset', colors: ['#ff9f0a', '#ff5500', '#d62800'] },
  { key: 'shopee', name: 'Shopee Ember', colors: ['#ff7a45', '#ee4d2d', '#b31e0f'] },
  { key: 'atome', name: 'Atome Lime', colors: ['#b8ff00', '#6eb800', '#1c4a00'] },
  { key: 'apple', name: 'Apple Cash', colors: ['#2c2c2e', '#1c1c1e', '#000000'] },
  { key: 'navy', name: 'Deep Navy', colors: ['#2952d4', '#173699', '#0b1640'] },
  { key: 'blue', name: 'Pacific Blue', colors: ['#0a84ff', '#0058d0', '#002e7a'] },
  { key: 'sky', name: 'Cyan Sky', colors: ['#5ac8fa', '#007aff', '#004aa6'] },
  { key: 'teal', name: 'Emerald Teal', colors: ['#2dd4bf', '#0f766e', '#043834'] },
  { key: 'green', name: 'Mint Green', colors: ['#30d158', '#009944', '#004d22'] },
  { key: 'gold', name: 'Imperial Gold', colors: ['#ffd60a', '#d4a72c', '#6e5410'] },
  { key: 'orange', name: 'Solar Orange', colors: ['#ff9f0a', '#ff6a00', '#b83200'] },
  { key: 'red', name: 'Crimson Red', colors: ['#ff453a', '#c9261f', '#7a0b07'] },
  { key: 'pink', name: 'Neon Pink', colors: ['#ff6482', '#d61f5c', '#800c34'] },
  { key: 'purple', name: 'Ultraviolet', colors: ['#bf5af2', '#7839ee', '#3b1285'] },
  { key: 'rose', name: 'Rose Gold', colors: ['#e8a598', '#b86678', '#632535'] },
  { key: 'silver', name: 'Titanium', colors: ['#c7c7cc', '#8e8e93', '#3a3a3c'] },
];

const AUTO_THEMES: [string, string, string?][] = CARD_COLORS.map((c) => c.colors);

/** Recognized bank & fintech brands for automatic branding, patterns & gradients */
const KNOWN: { match: RegExp; colors: [string, string, string?]; brand: string; network?: string }[] = [
  { match: /union\s?bank|ub/i, colors: ['#ff9f0a', '#ff5500', '#cc2200'], brand: 'UnionBank', network: 'VISA' },
  { match: /spaylater|shopee\s?pay|shopee/i, colors: ['#ff7a45', '#ee4d2d', '#b31e0f'], brand: 'Shopee', network: 'PAYLATER' },
  { match: /atome/i, colors: ['#c6ff00', '#74bf00', '#184700'], brand: 'Atome', network: 'PAYLATER' },
  { match: /apple\s?cash|apple/i, colors: ['#2c2c2e', '#1c1c1e', '#000000'], brand: 'Apple Cash', network: 'CASH' },
  { match: /lazada|lazpaylater/i, colors: ['#3d5afe', '#9c27b0', '#c2185b'], brand: 'Lazada', network: 'PAYLATER' },
  { match: /tiktok/i, colors: ['#22252a', '#fe2c55', '#25f4ee'], brand: 'TikTok', network: 'PAYLATER' },
  { match: /ggives|gcredit|g\s?cash|gloan/i, colors: ['#2f8cff', '#005de0', '#00338a'], brand: 'GCash', network: 'VISA' },
  { match: /maya/i, colors: ['#22c48a', '#128a5f', '#094730'], brand: 'Maya', network: 'MASTERCARD' },
  { match: /billease/i, colors: ['#14c3b0', '#0a8f81', '#06574f'], brand: 'BillEase', network: 'CREDIT' },
  { match: /home\s?credit/i, colors: ['#ff3b30', '#c71c14', '#700904'], brand: 'Home Credit', network: 'LOAN' },
  { match: /\bbdo\b/i, colors: ['#1f4fd1', '#0d3299', '#051854'], brand: 'BDO', network: 'MASTERCARD' },
  { match: /\bbpi\b/i, colors: ['#d4142f', '#960b1e', '#54030d'], brand: 'BPI', network: 'VISA' },
  { match: /metrobank|metro\s?bank/i, colors: ['#1a73d9', '#0b479e', '#052454'], brand: 'Metrobank', network: 'VISA' },
  { match: /security\s?bank/i, colors: ['#36b7e8', '#0f7ca8', '#074761'], brand: 'Security Bank', network: 'MASTERCARD' },
  { match: /\brcbc\b/i, colors: ['#2a5bb8', '#133b8a', '#081d4a'], brand: 'RCBC', network: 'VISA' },
  { match: /east\s?west/i, colors: ['#8e3aa8', '#5b1f6e', '#320b3d'], brand: 'EastWest', network: 'VISA' },
  { match: /landbank|land\s?bank/i, colors: ['#22a35a', '#126e39', '#093d1f'], brand: 'Landbank', network: 'VISA' },
  { match: /\bpnb\b/i, colors: ['#1e40af', '#102773', '#08143d'], brand: 'PNB', network: 'MASTERCARD' },
  { match: /grab/i, colors: ['#00b14f', '#007a37', '#004720'], brand: 'GrabPay', network: 'PAYLATER' },
  { match: /amazon|temu|shein/i, colors: ['#f59e0b', '#c27807', '#734400'], brand: 'Store', network: 'DEBIT' },
];

export const STORE_SUGGESTIONS = [
  'UnionBank',
  'Shopee',
  'Atome',
  'SPayLater',
  'GCash',
  'Maya',
  'BDO',
  'BPI',
  'BillEase',
  'TikTok PayLater',
  'Lazada',
  'Home Credit',
  'Security Bank',
  'Metrobank',
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradient([from, via, to]: [string, string, string?]): string {
  if (to) {
    return `linear-gradient(135deg, ${from} 0%, ${via} 52%, ${to} 100%)`;
  }
  return `linear-gradient(135deg, ${from} 0%, ${via} 100%)`;
}

export function isCardColor(key: string): boolean {
  return CARD_COLORS.some((c) => c.key === key);
}

function picked(key: string): string | null {
  const found = CARD_COLORS.find((c) => c.key === key);
  return found ? gradient(found.colors) : null;
}

/** Returns recognized brand information for logos, watermarks, and network badge */
export function getCardBrandInfo(name: string): { brand: string; network: string; isUnionBank: boolean; isAppleCash: boolean } {
  const clean = name.trim();
  const known = KNOWN.find((t) => t.match.test(clean));
  if (known) {
    return {
      brand: known.brand,
      network: known.network ?? 'DEBIT',
      isUnionBank: /union\s?bank|ub/i.test(clean),
      isAppleCash: /apple\s?cash|apple/i.test(clean),
    };
  }
  return {
    brand: clean || 'UTANG',
    network: 'DEBIT',
    isUnionBank: false,
    isAppleCash: false,
  };
}

/** Steady gradient generated from any text */
export function cardGradient(seed: string): string {
  return gradient(AUTO_THEMES[hash(seed) % AUTO_THEMES.length]);
}

/** Card color for a store or card name when no color was picked */
export function autoStoreGradient(store: string, seed: string): string {
  const known = KNOWN.find((t) => t.match.test(store));
  if (known) return gradient(known.colors);
  return cardGradient(store.trim() ? store.trim().toLowerCase() : seed);
}

/** Picked color first, then recognized brand color, then a steady color */
export function storeGradient(store: string, seed: string, color = ''): string {
  return picked(color) ?? autoStoreGradient(store, seed);
}

/** Color of a list's card */
export function listGradient(groupId: string, color = ''): string {
  return picked(color) ?? cardGradient(groupId);
}
