/** Card colors people can pick. The key is what gets saved. */
export const CARD_COLORS: { key: string; name: string; colors: [string, string, string?] }[] = [
  { key: 'blue', name: 'Pacific Blue', colors: ['#0080ff', '#0059e6', '#0038a8'] },
  { key: 'sunset', name: 'Coral Sunset', colors: ['#ff5e36', '#ff2a6d', '#8b008b'] },
  { key: 'aurora', name: 'Aurora Mesh', colors: ['#ff758c', '#ff7eb3', '#7928ca'] },
  { key: 'unionbank', name: 'UnionBank Sunset', colors: ['#ffaa00', '#ff6200', '#d62400'] },
  { key: 'shopee', name: 'Shopee Ember', colors: ['#ff6f3c', '#ee4d2d', '#c92a2a'] },
  { key: 'atome', name: 'Atome Lime', colors: ['#c6ff00', '#88e000', '#257000'] },
  { key: 'apple', name: 'Apple Cash', colors: ['#1c1c1e', '#2c2c2e', '#101012'] },
  { key: 'navy', name: 'Electric Sapphire', colors: ['#2563eb', '#1d4ed8', '#1e3a8a'] },
  { key: 'sky', name: 'Cyan Sky', colors: ['#06b6d4', '#0284c7', '#0369a1'] },
  { key: 'teal', name: 'Emerald Teal', colors: ['#14b8a6', '#0d9488', '#115e59'] },
  { key: 'green', name: 'Mint Green', colors: ['#22c55e', '#16a34a', '#14532d'] },
  { key: 'gold', name: 'Solar Amber', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  { key: 'orange', name: 'Solar Orange', colors: ['#fb923c', '#ea580c', '#c2410c'] },
  { key: 'red', name: 'Crimson Glow', colors: ['#f43f5e', '#e11d48', '#be123c'] },
  { key: 'pink', name: 'Neon Pink', colors: ['#f472b6', '#ec4899', '#db2777'] },
  { key: 'purple', name: 'Ultraviolet', colors: ['#a855f7', '#7c3aed', '#6d28d9'] },
  { key: 'rose', name: 'Rose Gold', colors: ['#fda4af', '#f43f5e', '#9f1239'] },
  { key: 'silver', name: 'Iridescent Silver', colors: ['#94a3b8', '#64748b', '#334155'] },
  { key: 'black', name: 'Obsidian Black', colors: ['#27272a', '#18181b', '#09090b'] },
];

const AUTO_THEMES: [string, string, string?][] = CARD_COLORS.map((c) => c.colors);

/** Recognized bank & fintech brands for automatic branding, patterns & gradients */
const KNOWN: { match: RegExp; colors: [string, string, string?]; brand: string; network?: string }[] = [
  { match: /union\s?bank|ub/i, colors: ['#ffaa00', '#ff6200', '#d62400'], brand: 'UnionBank', network: 'VISA' },
  { match: /spaylater|shopee\s?pay|shopee/i, colors: ['#ff6f3c', '#ee4d2d', '#c92a2a'], brand: 'Shopee', network: 'PAYLATER' },
  { match: /atome/i, colors: ['#c6ff00', '#88e000', '#257000'], brand: 'Atome', network: 'PAYLATER' },
  { match: /apple\s?cash|apple/i, colors: ['#2c2c2e', '#1c1c1e', '#09090b'], brand: 'Apple Cash', network: 'CASH' },
  { match: /lazada|lazpaylater/i, colors: ['#4f46e5', '#a855f7', '#ec4899'], brand: 'Lazada', network: 'PAYLATER' },
  { match: /tiktok/i, colors: ['#1e293b', '#0f172a', '#020617'], brand: 'TikTok', network: 'PAYLATER' },
  { match: /ggives|gcredit|g\s?cash|gloan/i, colors: ['#3b82f6', '#1d4ed8', '#1e40af'], brand: 'GCash', network: 'VISA' },
  { match: /maya/i, colors: ['#10b981', '#059669', '#047857'], brand: 'Maya', network: 'MASTERCARD' },
  { match: /billease/i, colors: ['#06b6d4', '#0891b2', '#0e7490'], brand: 'BillEase', network: 'CREDIT' },
  { match: /home\s?credit/i, colors: ['#ef4444', '#dc2626', '#b91c1c'], brand: 'Home Credit', network: 'LOAN' },
  { match: /\bbdo\b/i, colors: ['#2563eb', '#1d4ed8', '#172554'], brand: 'BDO', network: 'MASTERCARD' },
  { match: /\bbpi\b/i, colors: ['#e11d48', '#be123c', '#881337'], brand: 'BPI', network: 'VISA' },
  { match: /metrobank|metro\s?bank/i, colors: ['#0284c7', '#0369a1', '#075985'], brand: 'Metrobank', network: 'VISA' },
  { match: /security\s?bank/i, colors: ['#0ea5e9', '#0284c7', '#0369a1'], brand: 'Security Bank', network: 'MASTERCARD' },
  { match: /\brcbc\b/i, colors: ['#3b82f6', '#1d4ed8', '#1e3a8a'], brand: 'RCBC', network: 'VISA' },
  { match: /east\s?west/i, colors: ['#9333ea', '#7e22ce', '#581c87'], brand: 'EastWest', network: 'VISA' },
  { match: /landbank|land\s?bank/i, colors: ['#16a34a', '#15803d', '#14532d'], brand: 'Landbank', network: 'VISA' },
  { match: /\bpnb\b/i, colors: ['#2563eb', '#1e40af', '#1e3a8a'], brand: 'PNB', network: 'MASTERCARD' },
  { match: /grab/i, colors: ['#16a34a', '#15803d', '#166534'], brand: 'GrabPay', network: 'PAYLATER' },
  { match: /amazon|temu|shein/i, colors: ['#f59e0b', '#d97706', '#b45309'], brand: 'Store', network: 'DEBIT' },
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
