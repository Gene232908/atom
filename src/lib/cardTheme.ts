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

/**
 * Real brand colors for common banks and pay-later apps, so a card looks like the actual card.
 * Each one is a single brand color; brandGradient() adds a gentle light-to-shade around it.
 */
const KNOWN: { match: RegExp; base: string; brand: string; network?: string }[] = [
  { match: /union\s?bank|\bub\b/i, base: '#ff7f00', brand: 'UnionBank', network: 'VISA' },
  { match: /spaylater|shopee\s?pay|shopee/i, base: '#ee4d2d', brand: 'Shopee', network: 'PAYLATER' },
  { match: /atome/i, base: '#7cb518', brand: 'Atome', network: 'PAYLATER' },
  { match: /apple\s?cash|apple/i, base: '#1c1c1e', brand: 'Apple Cash', network: 'CASH' },
  { match: /lazada|lazpaylater/i, base: '#1a1f8f', brand: 'Lazada', network: 'PAYLATER' },
  { match: /tiktok/i, base: '#1c1c1e', brand: 'TikTok', network: 'PAYLATER' },
  { match: /ggives|gcredit|g\s?cash|gloan/i, base: '#007dfe', brand: 'GCash', network: 'VISA' },
  { match: /maya/i, base: '#00b464', brand: 'Maya', network: 'MASTERCARD' },
  { match: /billease/i, base: '#00a99d', brand: 'BillEase', network: 'CREDIT' },
  { match: /home\s?credit/i, base: '#e11931', brand: 'Home Credit', network: 'LOAN' },
  { match: /\bbdo\b/i, base: '#0047ba', brand: 'BDO', network: 'MASTERCARD' },
  { match: /\bbpi\b/i, base: '#c8102e', brand: 'BPI', network: 'VISA' },
  { match: /metrobank|metro\s?bank/i, base: '#0057b8', brand: 'Metrobank', network: 'VISA' },
  { match: /security\s?bank/i, base: '#0098d8', brand: 'Security Bank', network: 'MASTERCARD' },
  { match: /\brcbc\b/i, base: '#0057a8', brand: 'RCBC', network: 'VISA' },
  { match: /east\s?west/i, base: '#6a2c91', brand: 'EastWest', network: 'VISA' },
  { match: /landbank|land\s?bank/i, base: '#00964b', brand: 'Landbank', network: 'VISA' },
  { match: /\bpnb\b/i, base: '#0a3d91', brand: 'PNB', network: 'MASTERCARD' },
  { match: /grab/i, base: '#00b14f', brand: 'GrabPay', network: 'PAYLATER' },
  { match: /amazon|temu|shein/i, base: '#f59e0b', brand: 'Store', network: 'DEBIT' },
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

/** Blend a #rrggbb color toward white (amount > 0) or black (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const ch = (v: number) => Math.round(v + (target - v) * a);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Keeps the real brand color in the middle, a little lighter at the top and only a little deeper below. */
function brandGradient(base: string): string {
  return `linear-gradient(150deg, ${shade(base, 0.16)} 0%, ${base} 45%, ${shade(base, -0.18)} 100%)`;
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
  if (known) return brandGradient(known.base);
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
