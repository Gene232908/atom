import type { Group, Item } from './types';

/**
 * Bright, rich card colors (like Apple Wallet). Each card is one color going from
 * light to deep, so it looks colorful and clean, not a messy rainbow. The key is what gets saved.
 */
export const CARD_COLORS: { key: string; name: string; colors: [string, string] }[] = [
  { key: 'black', name: 'Black', colors: ['#3a3a3c', '#0b0b0c'] },
  { key: 'graphite', name: 'Graphite', colors: ['#6b6b70', '#2c2c2e'] },
  { key: 'navy', name: 'Navy', colors: ['#2547c9', '#0b1f66'] },
  { key: 'blue', name: 'Blue', colors: ['#1e90ff', '#0040c1'] },
  { key: 'sky', name: 'Sky', colors: ['#38bdf8', '#0369a1'] },
  { key: 'teal', name: 'Teal', colors: ['#14c8b4', '#0b6f66'] },
  { key: 'green', name: 'Green', colors: ['#34d36b', '#00804a'] },
  { key: 'olive', name: 'Lime', colors: ['#9ad61b', '#3f7a0c'] },
  { key: 'gold', name: 'Gold', colors: ['#fbbf24', '#c2620a'] },
  { key: 'terracotta', name: 'Orange', colors: ['#ff9f0a', '#e0430f'] },
  { key: 'red', name: 'Red', colors: ['#ff5a4f', '#b3121b'] },
  { key: 'rose', name: 'Pink', colors: ['#ff6b9a', '#c2185b'] },
  { key: 'plum', name: 'Purple', colors: ['#b45cf6', '#5b21b6'] },
  { key: 'silver', name: 'Silver', colors: ['#b4b4bc', '#5c5c66'] },
];

/** Older color names saved before still work. */
const ALIASES: Record<string, string> = {
  apple: 'black', space: 'navy', titanium: 'graphite', glacier: 'sky', tropical: 'teal', emerald: 'teal',
  sage: 'green', golden_hour: 'gold', copper: 'terracotta', orange: 'terracotta', plasma: 'terracotta',
  unionbank: 'terracotta', shopee: 'terracotta', sunset: 'terracotta', atome: 'olive', crimson_velvet: 'red',
  ruby: 'red', pink: 'rose', candy: 'rose', aurora: 'rose', purple: 'plum', amethyst: 'plum',
  cyberpunk: 'plum', lavender: 'plum',
};

/** Bright colors for common cards and pay-later apps, so a card is easy to recognize. */
const KNOWN: { match: RegExp; colors: [string, string]; brand: string; network?: string }[] = [
  { match: /union\s?bank|\bub\b/i, colors: ['#ffa21a', '#e04e0c'], brand: 'UnionBank', network: 'VISA' },
  { match: /spaylater|shopee\s?pay|shopee/i, colors: ['#ff7043', '#e0301e'], brand: 'Shopee', network: 'PAYLATER' },
  { match: /atome/i, colors: ['#9ad61b', '#3f7a0c'], brand: 'Atome', network: 'PAYLATER' },
  { match: /apple\s?cash|apple/i, colors: ['#3a3a3c', '#0b0b0c'], brand: 'Apple Cash', network: 'CASH' },
  { match: /lazada|lazpaylater/i, colors: ['#6a5cff', '#3a1fb8'], brand: 'Lazada', network: 'PAYLATER' },
  { match: /tiktok/i, colors: ['#33333a', '#0b0b0c'], brand: 'TikTok', network: 'PAYLATER' },
  { match: /ggives|gcredit|g\s?cash|gloan/i, colors: ['#2f8cff', '#0049b7'], brand: 'GCash', network: 'VISA' },
  { match: /maya/i, colors: ['#22c48a', '#0b6b4d'], brand: 'Maya', network: 'MASTERCARD' },
  { match: /billease/i, colors: ['#14c3b0', '#0b6b62'], brand: 'BillEase', network: 'CREDIT' },
  { match: /home\s?credit/i, colors: ['#f2554f', '#a51818'], brand: 'Home Credit', network: 'LOAN' },
  { match: /\bbdo\b/i, colors: ['#2a5bea', '#0a1f6b'], brand: 'BDO', network: 'MASTERCARD' },
  { match: /\bbpi\b/i, colors: ['#e8344f', '#8a1030'], brand: 'BPI', network: 'VISA' },
  { match: /metrobank|metro\s?bank/i, colors: ['#1f80e8', '#0b3b80'], brand: 'Metrobank', network: 'VISA' },
  { match: /security\s?bank/i, colors: ['#36b7e8', '#0b5f95'], brand: 'Security Bank', network: 'MASTERCARD' },
  { match: /\brcbc\b/i, colors: ['#3366d6', '#0c2558'], brand: 'RCBC', network: 'VISA' },
  { match: /east\s?west/i, colors: ['#a24fd4', '#4c1d6e'], brand: 'EastWest', network: 'VISA' },
  { match: /landbank|land\s?bank/i, colors: ['#26b062', '#0b5a2c'], brand: 'Landbank', network: 'VISA' },
  { match: /\bpnb\b/i, colors: ['#2547c9', '#0b1a4d'], brand: 'PNB', network: 'MASTERCARD' },
  { match: /grab/i, colors: ['#00c159', '#006b30'], brand: 'GrabPay', network: 'PAYLATER' },
  { match: /amazon|temu|shein/i, colors: ['#f7a21b', '#b45309'], brand: 'Store', network: 'DEBIT' },
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

/** One rich color, bright at the top-left and deep at the bottom-right. */
function gradient([from, to]: [string, string]): string {
  return `linear-gradient(150deg, ${from} 0%, ${to} 100%)`;
}

function resolveKey(key: string): string {
  return ALIASES[key] ?? key;
}

export function isCardColor(key: string): boolean {
  const k = resolveKey(key);
  return CARD_COLORS.some((c) => c.key === k);
}

function picked(key: string): string | null {
  const found = CARD_COLORS.find((c) => c.key === resolveKey(key));
  return found ? gradient(found.colors) : null;
}

export function swatch(key: string): string {
  return picked(key) ?? gradient(CARD_COLORS[0].colors);
}

/** Returns recognized brand information for logos, watermarks, and network badge */
export function getCardBrandInfo(name: string): { brand: string; network: string; isUnionBank: boolean; isAppleCash: boolean } {
  const clean = name.trim();
  const known = KNOWN.find((t) => t.match.test(clean));
  if (known) {
    return {
      brand: known.brand,
      network: known.network ?? 'DEBIT',
      isUnionBank: /union\s?bank|\bub\b/i.test(clean),
      isAppleCash: /apple\s?cash|apple/i.test(clean),
    };
  }
  return { brand: clean || 'UTANG', network: 'DEBIT', isUnionBank: false, isAppleCash: false };
}

/** Steady color generated from any text */
export function cardGradient(seed: string): string {
  return gradient(CARD_COLORS[hash(seed) % CARD_COLORS.length].colors);
}

/** Card color from a card / store name when no color was picked */
export function autoStoreGradient(store: string, seed: string): string {
  const known = KNOWN.find((t) => t.match.test(store));
  if (known) return gradient(known.colors);
  return cardGradient(store.trim() ? store.trim().toLowerCase() : seed);
}

/** Picked color first, then recognized brand color, then a steady color */
export function storeGradient(store: string, seed: string, color = ''): string {
  return picked(color) ?? autoStoreGradient(store, seed);
}

/** Color of a list's card: picked color, else the card name (e.g. "BDO"), else a steady color. */
export function listGradient(groupId: string, color = '', name = ''): string {
  return picked(color) ?? (name.trim() ? autoStoreGradient(name, groupId) : cardGradient(groupId));
}

export function groupGradient(group: Pick<Group, 'id' | 'color' | 'name'>): string {
  return listGradient(group.id, group.color, group.name);
}

/** Items use their own color if one was saved, otherwise their list's color. */
export function itemGradient(item: Pick<Item, 'id' | 'color' | 'store'>, group: Pick<Group, 'id' | 'color' | 'name'>): string {
  return picked(item.color) ?? (item.store?.trim() ? autoStoreGradient(item.store, item.id) : groupGradient(group));
}
