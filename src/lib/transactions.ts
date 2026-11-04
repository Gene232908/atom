import type { GroupItem } from '../hooks/useAllItems';
import { cleanRef } from './items';
import { formatMoney } from './money';
import type { Group, Item, PaymentRecord } from './types';

/** in = money you received (you lend). out = money you paid (you owe). */
export type Direction = 'in' | 'out';

export interface Transaction {
  key: string;
  item: GroupItem;
  payment: PaymentRecord;
  direction: Direction;
  otherUid: string;
  otherName: string;
  otherPhoto: string;
  /** When it was paid (ms). 0 when older items never saved a date. */
  at: number;
}

const LOCALE = 'en-PH';

/** Payments the lender confirmed, newest first. Includes older items that were only marked paid. */
export function confirmedHistory(item: Item, group: Group): PaymentRecord[] {
  const list = (item.payments ?? []).filter((p) => p && p.status === 'confirmed');
  const withRecord = new Set(list.map((p) => p.uid));
  for (const [pid, share] of Object.entries(item.shares ?? {})) {
    if (share?.status === 'paid' && pid !== group.ownerId && !withRecord.has(pid)) {
      list.push({
        id: `paid-${pid}`,
        uid: pid,
        payerName: group.members[pid]?.name ?? share.name ?? 'Borrower',
        amountCents: share.paidCents && share.paidCents > 0 ? share.paidCents : item.splitCents,
        refNumber: cleanRef(share.refNumber),
        status: 'confirmed',
        paidAt: share.updatedAt || item.updatedAt || 0,
      });
    }
  }
  return list.sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0));
}

/** Every confirmed payment that involves you: received on cards you lend, paid on cards you owe. */
export function buildTransactions(items: GroupItem[], uid: string): Transaction[] {
  const list: Transaction[] = [];
  for (const item of items) {
    const { group } = item;
    const isOwner = group.ownerId === uid;
    for (const payment of confirmedHistory(item, group)) {
      const mine = payment.uid === uid;
      if (isOwner === mine) continue;
      const otherUid = isOwner ? payment.uid : group.ownerId;
      const member = group.members[otherUid];
      list.push({
        key: `${group.id}:${item.id}:${payment.id}`,
        item,
        payment,
        direction: isOwner ? 'in' : 'out',
        otherUid,
        otherName: member?.name || (isOwner ? payment.payerName : '') || (isOwner ? 'Someone' : 'Lender'),
        otherPhoto: member?.photo ?? '',
        at: payment.paidAt || 0,
      });
    }
  }
  return list.sort((a, b) => b.at - a.at);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Today, Yesterday, or a short date like "Sep 25". */
export function dayLabel(at: number): string {
  if (!at) return 'Earlier';
  const d = new Date(at);
  const now = new Date();
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  });
}

/** "12:42 PM", or empty when the time was never saved. */
export function timeLabel(at: number): string {
  if (!at) return '';
  return new Date(at)
    .toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
}

/** "Today, 12:42 PM" or just "Sep 25" when there is no time. */
export function whenLabel(at: number): string {
  const time = timeLabel(at);
  return time ? `${dayLabel(at)}, ${time}` : dayLabel(at);
}

export function fullDate(at: number): string {
  return at ? new Date(at).toLocaleDateString(LOCALE, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not saved';
}

export function monthLabel(at: number): string {
  return at ? new Date(at).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }) : 'Earlier';
}

export function groupByMonth(list: Transaction[]): { label: string; items: Transaction[] }[] {
  const out: { label: string; items: Transaction[] }[] = [];
  for (const tx of list) {
    const label = monthLabel(tx.at);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(tx);
    else out.push({ label, items: [tx] });
  }
  return out;
}

/** Search by item, card, store, person, reference, amount or date (like "sep", "25" or "2026"). */
export function matchesQuery(tx: Transaction, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const p = tx.payment;
  const hay = [
    tx.item.description,
    tx.item.store,
    tx.item.group.name,
    tx.otherName,
    cleanRef(p.refNumber),
    p.note ?? '',
    formatMoney(p.amountCents),
    (p.amountCents / 100).toFixed(2),
    tx.at ? new Date(tx.at).toLocaleDateString(LOCALE, { month: 'long', day: 'numeric', year: 'numeric' }) : 'earlier',
    tx.at ? new Date(tx.at).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    dayLabel(tx.at),
    timeLabel(tx.at),
  ]
    .join(' ')
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}
