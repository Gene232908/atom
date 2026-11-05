import type { CardLayoutMode, DefaultViewPref } from '../components/home/DefaultViewSheet';

/** Settings saved on this device only. */
export const PREF_KEY = 'atom_default_home_tab';
export const LAYOUT_KEY = 'atom_card_layout_mode';

export function getStoredPref(): DefaultViewPref {
  try {
    const val = localStorage.getItem(PREF_KEY);
    if (val === 'lend' || val === 'owe' || val === 'loans' || val === 'auto') return val;
  } catch {
    // Private browsing can block storage. Use the default.
  }
  return 'auto';
}

export function getStoredLayout(): CardLayoutMode {
  try {
    const val = localStorage.getItem(LAYOUT_KEY);
    if (val === 'stack' || val === 'single') return val;
  } catch {
    // Private browsing can block storage. Use the default.
  }
  return 'stack';
}
