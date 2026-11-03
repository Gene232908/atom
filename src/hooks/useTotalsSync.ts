import { useEffect } from 'react';
import { saveTotals } from '../services/groups';
import { computeTotals, sameTotals } from '../lib/items';
import type { Group, Item } from '../lib/types';

/**
 * Only runs on the lender's device. Saves "how much each person owes"
 * on the list itself, so the home screen can show totals without
 * downloading every item of every list.
 */
export function useTotalsSync(group: Group, items: Item[], enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const totals = computeTotals(items, group.ownerId);
    if (sameTotals(totals, group.totals)) return;
    const timer = window.setTimeout(() => {
      saveTotals(group.id, totals).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [enabled, items, group.id, group.ownerId, group.totals]);
}
