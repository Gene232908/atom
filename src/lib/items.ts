import type { Group, Item, PersonSummary, Share } from './types';

export type ItemFilter = 'all' | 'unpaid' | 'waiting' | 'paid';

/** Shares of everyone except the lender (the lender never owes themselves). */
export function otherShares(item: Item, ownerId: string): [string, Share][] {
  return Object.entries(item.shares).filter(([uid]) => uid !== ownerId);
}

export function isItemDone(item: Item, ownerId: string): boolean {
  return otherShares(item, ownerId).every(([, s]) => s.status === 'paid');
}

export function itemProgress(item: Item, ownerId: string): { paid: number; total: number } {
  const others = otherShares(item, ownerId);
  return { paid: others.filter(([, s]) => s.status === 'paid').length, total: others.length };
}

export function matchesFilter(
  item: Item,
  ownerId: string,
  filter: ItemFilter,
  personUid: string | null,
): boolean {
  let shares: Share[];
  if (personUid) {
    const share = item.shares[personUid];
    if (!share) return false;
    shares = [share];
  } else {
    shares = otherShares(item, ownerId).map(([, s]) => s);
  }

  switch (filter) {
    case 'all':
      return true;
    case 'unpaid':
      return shares.some((s) => s.status !== 'paid');
    case 'waiting':
      return shares.some((s) => s.status === 'claimed');
    case 'paid':
      return shares.every((s) => s.status === 'paid');
  }
}

/** Unpaid amount per person, used for the totals shown on the home screen. */
export function computeTotals(items: Item[], ownerId: string): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const item of items) {
    for (const [uid, share] of otherShares(item, ownerId)) {
      if (share.status !== 'paid') totals[uid] = (totals[uid] ?? 0) + item.splitCents;
    }
  }
  return totals;
}

export function sameTotals(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) if ((a[key] ?? 0) !== (b[key] ?? 0)) return false;
  return true;
}

export function sumOwed(totals: Record<string, number>): number {
  return Object.values(totals).reduce((sum, v) => sum + v, 0);
}

/** Money summary for each person in the list. */
export function peopleSummary(group: Group, items: Item[]): PersonSummary[] {
  const map = new Map<string, PersonSummary>();
  const ensure = (uid: string, name: string): PersonSummary => {
    let p = map.get(uid);
    if (!p) {
      const m = group.members[uid];
      p = {
        uid,
        name: m?.name ?? name,
        email: m?.email ?? '',
        photo: m?.photo ?? '',
        isOwner: uid === group.ownerId,
        inList: group.memberIds.includes(uid),
        owes: 0,
        waiting: 0,
        paid: 0,
      };
      map.set(uid, p);
    }
    return p;
  };

  for (const uid of group.memberIds) ensure(uid, 'Someone');
  for (const item of items) {
    for (const [uid, share] of otherShares(item, group.ownerId)) {
      const p = ensure(uid, share.name);
      if (share.status === 'paid') p.paid += item.splitCents;
      else p.owes += item.splitCents;
      if (share.status === 'claimed') p.waiting += item.splitCents;
    }
  }

  return [...map.values()]
    .filter((p) => p.inList || p.owes > 0 || p.paid > 0)
    .sort((a, b) => {
      if (a.isOwner !== b.isOwner) return a.isOwner ? -1 : 1;
      if (a.owes !== b.owes) return b.owes - a.owes;
      return a.name.localeCompare(b.name);
    });
}

export interface DueInfo {
  text: string;
  tone: 'red' | 'amber' | 'slate';
}

export function dueInfo(due: string | null, done: boolean): DueInfo | null {
  if (!due) return null;
  const [y, m, d] = due.split('-').map(Number);
  if (!y || !m || !d) return null;
  const dueDate = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
  const pretty = dueDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: dueDate.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });

  if (done) return { text: `Due ${pretty}`, tone: 'slate' };
  if (days < 0) return { text: `Late. Was due ${pretty}`, tone: 'red' };
  if (days === 0) return { text: 'Due today', tone: 'red' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'amber' };
  if (days <= 7) return { text: `Due in ${days} days`, tone: 'amber' };
  return { text: `Due ${pretty}`, tone: 'slate' };
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}
