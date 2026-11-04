import type { GroupItem } from '../hooks/useAllItems';
import { sumOwed } from './items';
import type { Group, Item } from './types';

function confirmedPaid(item: Item, uid: string): number {
  const payments = Array.isArray(item.payments) ? item.payments : [];
  const fromPayments = payments
    .filter((p) => p && p.uid === uid && p.status === 'confirmed')
    .reduce((sum, p) => sum + (p.amountCents || 0), 0);
  return Math.max(item.shares?.[uid]?.paidCents || 0, fromPayments);
}

/** Live "You owe" and "To collect" totals, counting partial and confirmed payments. */
export function computeBalances(items: GroupItem[], groups: Group[], uid: string): { youOwe: number; owedToYou: number } {
  let owe = 0;
  let owed = 0;

  // Items not loaded yet: fall back to the totals saved on each list.
  if (items.length === 0 && groups.length > 0) {
    for (const g of groups) {
      if (g.groupType === 'loan') continue;
      if (g.ownerId === uid) owed += sumOwed(g.totals);
      else if (g.members[uid]?.status !== 'pending') owe += g.totals[uid] ?? 0;
    }
    return { youOwe: owe, owedToYou: owed };
  }

  for (const item of items) {
    if (item.isPersonalLoan || item.group.groupType === 'loan') continue;

    if (item.group.ownerId === uid) {
      for (const [pid, share] of Object.entries(item.shares || {})) {
        if (pid === uid || !share || share.status === 'paid') continue;
        owed += Math.max(0, item.splitCents - confirmedPaid(item, pid));
      }
    } else {
      const mine = item.shares?.[uid];
      if (mine && mine.status !== 'paid' && item.group.members[uid]?.status !== 'pending') {
        owe += Math.max(0, item.splitCents - confirmedPaid(item, uid));
      }
    }
  }
  return { youOwe: owe, owedToYou: owed };
}
