import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toItem } from '../lib/convert';
import { confirmedPaid } from '../lib/items';
import type { Item, PaymentRecord, Share, ShareStatus } from '../lib/types';

/** Safety cap so a single list can never use up the daily free reads. */
const MAX_ITEMS = 300;

export interface ItemInput {
  description: string;
  priceCents: number;
  splitCents: number;
  shares: Record<string, Share>;
  dueDate: string | null;
  billingCycle?: string;
  installmentsCount?: number;
  monthlyCents?: number;
  store: string;
  color: string;
}

const itemsRef = (groupId: string) => collection(db, 'groups', groupId, 'items');

export function subscribeItems(
  groupId: string,
  onData: (items: Item[], fromServer: boolean) => void,
  onError: (err: unknown) => void,
): () => void {
  const q = query(itemsRef(groupId), orderBy('createdAt', 'desc'), limit(MAX_ITEMS));
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      onData(
        snap.docs.map((d) => toItem(d.id, d.data())),
        !snap.metadata.fromCache,
      );
    },
    onError,
  );
}

export async function addItem(groupId: string, input: ItemInput): Promise<void> {
  const now = Date.now();
  const data: Record<string, unknown> = {
    description: input.description.trim().slice(0, 200),
    priceCents: Math.round(input.priceCents),
    splitCents: Math.round(input.splitCents),
    shares: input.shares,
    dueDate: input.dueDate ?? null,
    store: (input.store || '').trim().slice(0, 40),
    color: input.color || '',
    payments: [],
    createdAt: now,
    updatedAt: now,
  };

  if (input.billingCycle && input.billingCycle.trim()) {
    data.billingCycle = input.billingCycle.trim();
  }
  if (input.installmentsCount && input.installmentsCount > 1) {
    data.installmentsCount = Math.round(input.installmentsCount);
  }
  if (input.monthlyCents && input.monthlyCents > 0) {
    data.monthlyCents = Math.round(input.monthlyCents);
  }

  await addDoc(itemsRef(groupId), data);
}

export function updateItem(groupId: string, itemId: string, input: ItemInput): Promise<void> {
  const data: Record<string, unknown> = {
    description: input.description.trim().slice(0, 200),
    priceCents: Math.round(input.priceCents),
    splitCents: Math.round(input.splitCents),
    shares: input.shares,
    dueDate: input.dueDate ?? null,
    store: (input.store || '').trim().slice(0, 40),
    color: input.color || '',
    updatedAt: Date.now(),
  };

  if (input.billingCycle && input.billingCycle.trim()) {
    data.billingCycle = input.billingCycle.trim();
  } else {
    data.billingCycle = deleteField();
  }

  if (input.installmentsCount && input.installmentsCount > 1) {
    data.installmentsCount = Math.round(input.installmentsCount);
  } else {
    data.installmentsCount = deleteField();
  }

  if (input.monthlyCents && input.monthlyCents > 0) {
    data.monthlyCents = Math.round(input.monthlyCents);
  } else {
    data.monthlyCents = deleteField();
  }

  return updateDoc(doc(db, 'groups', groupId, 'items', itemId), data);
}

export function deleteItem(groupId: string, itemId: string): Promise<void> {
  return deleteDoc(doc(db, 'groups', groupId, 'items', itemId));
}

export async function setShareStatus(
  groupId: string,
  itemId: string,
  uid: string,
  status: ShareStatus,
  refNumber?: string,
): Promise<void> {
  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`shares.${uid}.status`]: status,
    [`shares.${uid}.updatedAt`]: now,
    updatedAt: now,
  };
  if (refNumber !== undefined && refNumber.trim()) {
    updates[`shares.${uid}.refNumber`] = refNumber.trim();
  }
  try {
    await updateDoc(doc(db, 'groups', groupId, 'items', itemId), updates);
  } catch (err) {
    // If deployed Firestore rules reject extra field like refNumber, retry with only status & updatedAt
    if (refNumber !== undefined) {
      delete updates[`shares.${uid}.refNumber`];
      await updateDoc(doc(db, 'groups', groupId, 'items', itemId), updates);
      return;
    }
    throw err;
  }
}

/**
 * Record a payment.
 * - From the borrower (status 'pending'): saved as "sent, waiting". The balance does NOT go down yet.
 * - From the lender (status 'confirmed'): counted as paid right away.
 */
export async function recordPayment(
  groupId: string,
  item: Item,
  payment: Omit<PaymentRecord, 'id' | 'paidAt'>,
): Promise<void> {
  const now = Date.now();
  const record: PaymentRecord = { ...payment, id: Math.random().toString(36).slice(2, 10), paidAt: now };
  const payments = [record, ...(item.payments ?? [])];
  const share = item.shares[payment.uid];
  const ref = { groupId, itemId: item.id };

  if (payment.status === 'confirmed') {
    const newPaid = Math.min(item.splitCents, confirmedPaid(item, payment.uid) + payment.amountCents);
    const done = newPaid >= item.splitCents;
    await updateDoc(doc(db, 'groups', ref.groupId, 'items', ref.itemId), {
      payments,
      [`shares.${payment.uid}.paidCents`]: newPaid,
      [`shares.${payment.uid}.status`]: done ? 'paid' : share?.status === 'claimed' ? 'claimed' : 'unpaid',
      [`shares.${payment.uid}.refNumber`]: payment.refNumber,
      [`shares.${payment.uid}.updatedAt`]: now,
      updatedAt: now,
    });
    return;
  }

  // Pending: add to what they already sent but the lender has not confirmed yet.
  const claim = (share?.status === 'claimed' ? share.claimCents ?? 0 : 0) + payment.amountCents;
  try {
    await updateDoc(doc(db, 'groups', ref.groupId, 'items', ref.itemId), {
      payments,
      [`shares.${payment.uid}.status`]: 'claimed',
      [`shares.${payment.uid}.claimCents`]: claim,
      [`shares.${payment.uid}.refNumber`]: payment.refNumber,
      [`shares.${payment.uid}.updatedAt`]: now,
      updatedAt: now,
    });
  } catch {
    // Older Firebase rules only allow the status. The lender will type the amount when confirming.
    await setShareStatus(groupId, item.id, payment.uid, 'claimed', payment.refNumber);
  }
}

/**
 * Lender confirms money they received from one person.
 * `amountCents` is what the lender typed. If empty, we use what the person said they sent.
 * Only the confirmed amount is counted, so a half payment stays a half payment.
 */
export async function confirmPayment(
  groupId: string,
  item: Item,
  paymentId: string,
  targetUid?: string,
  amountCents?: number,
): Promise<void> {
  const now = Date.now();
  let payments = item.payments ? [...item.payments] : [];
  const uid = targetUid || payments.find((p) => p.id === paymentId)?.uid;
  if (!uid) return;

  const share = item.shares[uid];
  const alreadyPaid = confirmedPaid(item, uid);
  const left = Math.max(0, item.splitCents - alreadyPaid);
  const pendingId = payments.find((p) => p.uid === uid && p.status === 'pending')?.id ?? null;
  const pendingTotal = payments.filter((p) => p.uid === uid && p.status === 'pending').reduce((s, p) => s + (p.amountCents || 0), 0);
  const suggested = (share?.status === 'claimed' ? share.claimCents : 0) || pendingTotal || left;
  const amount = Math.min(left, Math.max(0, amountCents ?? suggested));
  if (amount <= 0) return;

  const refNum = share?.refNumber || 'Confirmed by lender';
  // All pending records of this person become one confirmed record with the real amount.
  payments = payments.filter((p) => !(p.uid === uid && p.status === 'pending'));
  payments.unshift({
    id: pendingId ?? `pay-${uid}-${now}`,
    uid,
    payerName: share?.name ?? 'Borrower',
    amountCents: amount,
    refNumber: refNum,
    note: amount < left ? 'Partial payment' : 'Payment confirmed',
    status: 'confirmed',
    paidAt: now,
  });

  const newPaid = alreadyPaid + amount;
  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), {
    payments,
    [`shares.${uid}.status`]: newPaid >= item.splitCents ? 'paid' : 'unpaid',
    [`shares.${uid}.paidCents`]: newPaid,
    [`shares.${uid}.claimCents`]: 0,
    [`shares.${uid}.refNumber`]: refNum,
    [`shares.${uid}.updatedAt`]: now,
    updatedAt: now,
  });
}

/** Lender undoes payments for a member, reverting status to unpaid and clearing their history. */
export async function undoPayment(groupId: string, item: Item, uid: string): Promise<void> {
  const now = Date.now();
  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), {
    payments: (item.payments ?? []).filter((p) => p.uid !== uid),
    [`shares.${uid}.status`]: 'unpaid',
    [`shares.${uid}.paidCents`]: 0,
    [`shares.${uid}.claimCents`]: 0,
    [`shares.${uid}.refNumber`]: '',
    [`shares.${uid}.updatedAt`]: now,
    updatedAt: now,
  });
}

/** Lender only: marks every unpaid share of one person as paid. */
export async function markPersonPaid(groupId: string, items: Item[], uid: string): Promise<void> {
  const targets = items.filter((it) => it.shares[uid] && it.shares[uid].status !== 'paid');
  const now = Date.now();
  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db);
    for (const item of targets.slice(i, i + 400)) {
      batch.update(doc(db, 'groups', groupId, 'items', item.id), {
        [`shares.${uid}.status`]: 'paid',
        [`shares.${uid}.updatedAt`]: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }
}

/** Person (not the lender) says they paid all of their unpaid items at once. */
export async function claimAll(groupId: string, items: Item[], uid: string): Promise<void> {
  const targets = items.filter((it) => it.shares[uid]?.status === 'unpaid');
  const now = Date.now();
  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db);
    for (const item of targets.slice(i, i + 400)) {
      batch.update(doc(db, 'groups', groupId, 'items', item.id), {
        [`shares.${uid}.status`]: 'claimed',
        [`shares.${uid}.updatedAt`]: now,
        updatedAt: now,
      });
    }
    await batch.commit();
  }
}
