/** Card colors people can pick. The key is what gets saved. */
export const CARD_COLORS: { key: string; name: string; colors: [string, string] }[] = [
  { key: 'black', name: 'Black', colors: ['#3a3a3c', '#0b0b0c'] },
  { key: 'navy', name: 'Navy', colors: ['#2547a8', '#0b1640'] },
  { key: 'blue', name: 'Blue', colors: ['#0a84ff', '#0040c1'] },
  { key: 'sky', name: 'Sky', colors: ['#5ac8fa', '#0a5fc0'] },
  { key: 'teal', name: 'Teal', colors: ['#2dd4bf', '#0f766e'] },
  { key: 'green', name: 'Green', colors: ['#30d158', '#00804a'] },
  { key: 'lime', name: 'Lime', colors: ['#9ad61b', '#3a6110'] },
  { key: 'gold', name: 'Gold', colors: ['#d4a72c', '#6e5410'] },
  { key: 'orange', name: 'Orange', colors: ['#ff9f0a', '#e3361b'] },
  { key: 'red', name: 'Red', colors: ['#ff453a', '#8f0d0d'] },
  { key: 'pink', name: 'Pink', colors: ['#ff6482', '#b3124f'] },
  { key: 'purple', name: 'Purple', colors: ['#bf5af2', '#4e3fd8'] },
  { key: 'rose', name: 'Rose gold', colors: ['#e8a598', '#94485a'] },
  { key: 'silver', name: 'Silver', colors: ['#a1a1aa', '#3f3f46'] },
];

const AUTO_THEMES: [string, string][] = CARD_COLORS.map((c) => c.colors);

/** Colors for common cards, banks, pay-later apps and stores, so cards are easy to recognize. */
const KNOWN: { match: RegExp; colors: [string, string] }[] = [
  { match: /spaylater|shopee\s?pay|shopee/i, colors: ['#ff7a45', '#e3361b'] },
  { match: /lazada|lazpaylater/i, colors: ['#3d5afe', '#c2185b'] },
  { match: /tiktok/i, colors: ['#2b2b2e', '#d6214f'] },
  { match: /atome/i, colors: ['#9ad61b', '#2f5a0c'] },
  { match: /ggives|gcredit|g\s?cash|gloan/i, colors: ['#2f8cff', '#0049b7'] },
  { match: /maya/i, colors: ['#22c48a', '#0f6b4d'] },
  { match: /billease/i, colors: ['#14c3b0', '#0b6b62'] },
  { match: /home\s?credit/i, colors: ['#ef4444', '#991b1b'] },
  { match: /\bbdo\b/i, colors: ['#1f4fd1', '#0a1f6b'] },
  { match: /\bbpi\b/i, colors: ['#d4142f', '#6b0716'] },
  { match: /union\s?bank/i, colors: ['#ff8a00', '#b8400a'] },
  { match: /metrobank|metro\s?bank/i, colors: ['#1a73d9', '#0b3b80'] },
  { match: /security\s?bank/i, colors: ['#36b7e8', '#0b5f95'] },
  { match: /\brcbc\b/i, colors: ['#2a5bb8', '#0c2558'] },
  { match: /east\s?west/i, colors: ['#8e3aa8', '#3c1046'] },
  { match: /landbank|land\s?bank/i, colors: ['#22a35a', '#0b5a2c'] },
  { match: /\bpnb\b/i, colors: ['#1e40af', '#0b1a4d'] },
  { match: /grab/i, colors: ['#00b14f', '#006b30'] },
  { match: /amazon|temu|shein/i, colors: ['#f59e0b', '#b45309'] },
];

/** Quick buttons in the item form. */
export const STORE_SUGGESTIONS = [
  'Atome',
  'SPayLater',
  'TikTok PayLater',
  'GGives',
  'BDO',
  'BPI',
  'UnionBank',
  'Metrobank',
  'Security Bank',
  'Home Credit',
  'Maya',
  'Shopee',
  'Lazada',
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function gradient([from, to]: [string, string]): string {
  return `linear-gradient(145deg, ${from} 0%, ${to} 100%)`;
}

export function isCardColor(key: string): boolean {
  return CARD_COLORS.some((c) => c.key === key);
}

function picked(key: string): string | null {
  const found = CARD_COLORS.find((c) => c.key === key);
  return found ? gradient(found.colors) : null;
}

/** A steady color from any text (the same text always gets the same color). */
export function cardGradient(seed: string): string {
  return gradient(AUTO_THEMES[hash(seed) % AUTO_THEMES.length]);
}

/** Card color for a store or card name when no color was picked. */
export function autoStoreGradient(store: string, seed: string): string {
  const known = KNOWN.find((t) => t.match.test(store));
  if (known) return gradient(known.colors);
  return cardGradient(store.trim() ? store.trim().toLowerCase() : seed);
}

/** Picked color first, then the card/store color, then a steady color. */
export function storeGradient(store: string, seed: string, color = ''): string {
  return picked(color) ?? autoStoreGradient(store, seed);
}

/** Color of a whole list's card. */
export function listGradient(groupId: string, color = ''): string {
  return picked(color) ?? cardGradient(groupId);
}
