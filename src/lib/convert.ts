import type { DocumentData } from 'firebase/firestore';
import { isCardColor } from './cardTheme';
import type { Group, Invite, Item, Member, Share, ShareStatus } from './types';

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

function toShare(raw: unknown): Share {
  const s = obj(raw);
  const status = STATUSES.includes(s.status as ShareStatus) ? (s.status as ShareStatus) : 'unpaid';
  return { name: str(s.name, 'Someone'), status, updatedAt: num(s.updatedAt) };
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

  return {
    id,
    description: str(d.description, 'No description'),
    priceCents: Math.round(num(d.priceCents)),
    splitCents: Math.round(num(d.splitCents)),
    shares,
    dueDate: typeof d.dueDate === 'string' && d.dueDate ? d.dueDate : null,
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
