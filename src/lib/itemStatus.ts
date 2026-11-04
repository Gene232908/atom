import { amountProgress, itemProgress, otherShares } from './items';
import type { Item } from './types';

export type Tone = 'bad' | 'warn' | 'ok' | 'muted' | 'accent';

export interface RowStatus {
  label: string;
  tone: Tone;
  /** Money still left to pay (or the share amount when fully paid). */
  amount: number;
  done: boolean;
}

/** How much one person still has to pay on an item. */
export function remainingFor(item: Item, uid: string): number {
  const share = item.shares?.[uid];
  if (!share || share.status === 'paid') return 0;
  return Math.max(0, item.splitCents - (share.paidCents ?? 0));
}

/**
 * Status of an item from the point of view of the viewer.
 * Lender sees the whole item, a borrower (or a focused person) sees only their share.
 */
export function rowStatus(item: Item, ownerId: string, viewerUid: string, focusUid: string | null = null): RowStatus {
  const isOwner = ownerId === viewerUid;
  const person = focusUid ?? (isOwner ? null : viewerUid);

  if (person) {
    const share = item.shares?.[person];
    if (!share) return { label: 'Not included', tone: 'muted', amount: 0, done: false };
    if (share.status === 'paid') return { label: 'Paid', tone: 'ok', amount: item.splitCents, done: true };
    const left = remainingFor(item, person);
    if (share.status === 'claimed') return { label: 'Waiting', tone: 'warn', amount: left, done: false };
    if ((share.paidCents ?? 0) > 0) return { label: 'Partly paid', tone: 'accent', amount: left, done: false };
    return { label: 'Not paid', tone: 'bad', amount: left, done: false };
  }

  const others = otherShares(item, ownerId);
  const left = others.reduce((sum, [uid]) => sum + remainingFor(item, uid), 0);
  const { paid, total } = itemProgress(item, ownerId);
  if (total === 0) return { label: 'No members', tone: 'muted', amount: 0, done: false };
  if (paid === total) return { label: 'All paid', tone: 'ok', amount: item.priceCents, done: true };
  if (others.some(([, s]) => s.status === 'claimed')) return { label: 'To confirm', tone: 'warn', amount: left, done: false };
  const pct = amountProgress(item, ownerId).percent;
  if (pct > 0) return { label: `${pct}% paid`, tone: 'accent', amount: left, done: false };
  return { label: 'Not paid', tone: 'bad', amount: left, done: false };
}

/** Number of days until a YYYY-MM-DD date (negative when late). */
export function daysUntil(due: string | null): number | null {
  if (!due) return null;
  const [y, m, d] = due.split('-').map(Number);
  if (!y || !m || !d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000);
}

/** Short due label for tables, e.g. "3 days late", "Due today", "Due Nov 14". */
export function shortDue(due: string | null, done: boolean): { text: string; tone: 'red' | 'amber' | 'slate' } | null {
  const days = daysUntil(due);
  if (days === null || !due) return null;
  const [y, m, d] = due.split('-').map(Number);
  const pretty = new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  if (done) return { text: pretty, tone: 'slate' };
  if (days < 0) return { text: `${-days} ${days === -1 ? 'day' : 'days'} late`, tone: 'red' };
  if (days === 0) return { text: 'Due today', tone: 'red' };
  if (days === 1) return { text: 'Tomorrow', tone: 'amber' };
  if (days <= 7) return { text: `In ${days} days`, tone: 'amber' };
  return { text: pretty, tone: 'slate' };
}
