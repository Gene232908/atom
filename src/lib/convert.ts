import type { DocumentData } from 'firebase/firestore';
import { isCardColor } from './cardTheme';
import type { Group, Invite, Item, Member, PaymentRecord, Share, ShareStatus } from './types';

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const STATUSES: ShareStatus[] = ['unpaid', 'claimed', 'paid'];

function toMember(raw: unknown): Member {
  const m = obj(raw);
  return {
    name: str(m.name, 'Someone'),
    email: str(m.email),
    photo: str(m.photo),
    joinedAt: num(m.joinedAt),
  };
}

function toPaymentRecord(raw: unknown): PaymentRecord {
  const p = obj(raw);
  const status = p.status === 'confirmed' ? 'confirmed' : 'pending';
  return {
    id: str(p.id, Math.random().toString(36).slice(2)),
    uid: str(p.uid),
    payerName: str(p.payerName, 'Borrower'),
    amountCents: Math.round(num(p.amountCents)),
    refNumber: str(p.refNumber),
    paidAt: num(p.paidAt, Date.now()),
    note: typeof p.note === 'string' ? p.note : undefined,
    status,
  };
}

function toShare(raw: unknown): Share {
  const s = obj(raw);
  const status = STATUSES.includes(s.status as ShareStatus) ? (s.status as ShareStatus) : 'unpaid';
  return {
    name: str(s.name, 'Someone'),
    status,
    updatedAt: num(s.updatedAt),
    paidCents: typeof s.paidCents === 'number' ? Math.round(s.paidCents) : undefined,
    refNumber: typeof s.refNumber === 'string' ? s.refNumber : undefined,
    claimCents: typeof s.claimCents === 'number' && s.claimCents > 0 ? Math.round(s.claimCents) : undefined,
    rejectedCents: typeof s.rejectedCents === 'number' && s.rejectedCents > 0 ? Math.round(s.rejectedCents) : undefined,
  };
}

/** Reads a list safely, even if some fields are missing. */
export function toGroup(id: string, d: DocumentData): Group {
  const members: Record<string, Member> = {};
  for (const [uid, raw] of Object.entries(obj(d.members))) members[uid] = toMember(raw);

  const totals: Record<string, number> = {};
  for (const [uid, v] of Object.entries(obj(d.totals))) totals[uid] = num(v);

  const memberIds = Array.isArray(d.memberIds)
    ? d.memberIds.filter((x: unknown): x is string => typeof x === 'string')
    : [];

  return {
    id,
    name: str(d.name, 'Untitled list'),
    ownerId: str(d.ownerId),
    memberIds,
    members,
    inviteCode: str(d.inviteCode),
    paymentNote: str(d.paymentNote),
    hasQr: d.hasQr === true,
    color: isCardColor(str(d.color)) ? str(d.color) : '',
    totals,
    createdAt: num(d.createdAt),
    updatedAt: num(d.updatedAt),
  };
}

export function toItem(id: string, d: DocumentData): Item {
  const shares: Record<string, Share> = {};
  for (const [uid, raw] of Object.entries(obj(d.shares))) shares[uid] = toShare(raw);

  const payments: PaymentRecord[] = Array.isArray(d.payments)
    ? d.payments.map((p: unknown) => toPaymentRecord(p))
    : [];

  return {
    id,
    description: str(d.description, 'No description'),
    priceCents: Math.round(num(d.priceCents)),
    splitCents: Math.round(num(d.splitCents)),
    shares,
    dueDate: typeof d.dueDate === 'string' && d.dueDate ? d.dueDate : null,
    billingCycle: typeof d.billingCycle === 'string' && d.billingCycle ? d.billingCycle : undefined,
    installmentsCount: typeof d.installmentsCount === 'number' ? Math.round(d.installmentsCount) : undefined,
    monthlyCents: typeof d.monthlyCents === 'number' ? Math.round(d.monthlyCents) : undefined,
    payments,
    store: str(d.store).slice(0, 40),
    color: isCardColor(str(d.color)) ? str(d.color) : '',
    createdAt: num(d.createdAt),
    updatedAt: num(d.updatedAt),
  };
}

export function toInvite(d: DocumentData): Invite {
  return {
    groupId: str(d.groupId),
    groupName: str(d.groupName, 'a list'),
    ownerName: str(d.ownerName, 'Someone'),
  };
}
