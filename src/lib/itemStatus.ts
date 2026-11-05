import { amountProgress, confirmedPaid, dueInfo, isItemDone, itemProgress, itemShareOwed, otherShares, type DueInfo } from './items';
import { formatMoney } from './money';
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
  return Math.max(0, itemShareOwed(item, uid) - (share.paidCents ?? 0));
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
    const owed = itemShareOwed(item, person);
    if (share.status === 'paid') return { label: 'Paid', tone: 'ok', amount: owed, done: true };
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

export interface NextPayment {
  /** YYYY-MM-DD of the next payment */
  date: string;
  /** What is still due for this payment */
  amountCents: number;
  /** 1-based payment number and how many there are */
  period: number;
  of: number;
}

/** Amount one person pays each period (the whole share when it is not an installment). */
function periodCents(item: Item): number {
  const n = item.installmentsCount ?? 0;
  if (n <= 1) return item.splitCents;
  return item.monthlyCents && item.monthlyCents > 0 ? item.monthlyCents : Math.ceil(item.splitCents / n);
}

function addMonths(date: string, months: number): string | null {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const last = new Date(y, m - 1 + months + 1, 0).getDate();
  const out = new Date(y, m - 1 + months, Math.min(d, last));
  return `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, '0')}-${String(out.getDate()).padStart(2, '0')}`;
}

/**
 * The next payment one person still has to make. Worked out from what the lender confirmed:
 * paying a whole month moves the due date to the next month, a part payment keeps the same date.
 */
export function nextPaymentFor(item: Item, uid: string): NextPayment | null {
  const share = item.shares?.[uid];
  if (!item.dueDate || !share || share.status === 'paid') return null;
  const left = remainingFor(item, uid);
  if (left <= 0) return null;
  const of = Math.max(1, item.installmentsCount ?? 1);
  const per = periodCents(item);
  const paid = confirmedPaid(item, uid);
  const k = per > 0 ? Math.min(of - 1, Math.floor(paid / per)) : 0;
  const date = addMonths(item.dueDate, k);
  if (!date) return null;
  return { date, amountCents: Math.max(1, Math.min(left, per * (k + 1) - paid)), period: k + 1, of };
}

/** Which person's payment to follow: the viewer's own, or (for the lender) the soonest one owed. */
export function nextPayment(item: Item, ownerId: string, viewerUid: string, focusUid: string | null = null): NextPayment | null {
  const person = focusUid ?? (ownerId === viewerUid ? null : viewerUid);
  if (person) return nextPaymentFor(item, person);
  let best: NextPayment | null = null;
  for (const [uid] of otherShares(item, ownerId)) {
    const next = nextPaymentFor(item, uid);
    if (next && (!best || next.date < best.date)) best = next;
  }
  return best;
}

/** The due date to show: the next payment, or the original date when nothing is left to pay. */
export function effectiveDueDate(item: Item, ownerId: string, viewerUid: string, focusUid: string | null = null): string | null {
  return nextPayment(item, ownerId, viewerUid, focusUid)?.date ?? item.dueDate;
}

/** Due chip for an item. After a whole month is paid it says "Next payment Dec 10 · ₱100.00". */
export function nextDueInfo(item: Item, ownerId: string, viewerUid: string, focusUid: string | null = null): DueInfo | null {
  const person = focusUid ?? (ownerId === viewerUid ? null : viewerUid);
  const done = person ? item.shares?.[person]?.status === 'paid' : isItemDone(item, ownerId);
  const next = nextPayment(item, ownerId, viewerUid, focusUid);
  const info = dueInfo(next?.date ?? item.dueDate, done);
  if (!info || !next || next.of <= 1 || next.period <= 1 || info.tone === 'red') return info;
  return { ...info, text: `${info.text.replace(/^Due /, 'Next payment ')} · ${formatMoney(next.amountCents)}` };
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
