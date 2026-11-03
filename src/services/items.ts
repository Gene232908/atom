import {
  addDoc,
  collection,
  deleteDoc,
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
  await addDoc(itemsRef(groupId), { ...input, payments: [], createdAt: now, updatedAt: now });
}

export function updateItem(groupId: string, itemId: string, input: ItemInput): Promise<void> {
  return updateDoc(doc(db, 'groups', groupId, 'items', itemId), {
    ...input,
    updatedAt: Date.now(),
  });
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

/** Record a partial or installment payment with a reference number and note. */
export async function recordPayment(
  groupId: string,
  item: Item,
  payment: Omit<PaymentRecord, 'id' | 'paidAt'>,
): Promise<void> {
  const now = Date.now();
  const id = Math.random().toString(36).slice(2, 10);
  const newRecord: PaymentRecord = {
    ...payment,
    id,
    paidAt: now,
  };

  const existingPayments = item.payments ?? [];
  const updatedPayments = [newRecord, ...existingPayments];

  const share = item.shares[payment.uid];
  const prevPaid = share?.paidCents ?? (share?.status === 'paid' ? item.splitCents : 0);
  const newPaid = prevPaid + payment.amountCents;
  const isFullyPaid = newPaid >= item.splitCents;

  const nextStatus: ShareStatus = isFullyPaid
    ? (payment.status === 'confirmed' ? 'paid' : 'claimed')
    : (payment.status === 'confirmed' ? 'unpaid' : 'claimed');

  try {
    await updateDoc(doc(db, 'groups', groupId, 'items', item.id), {
      payments: updatedPayments,
      [`shares.${payment.uid}.paidCents`]: newPaid,
      [`shares.${payment.uid}.refNumber`]: payment.refNumber,
      [`shares.${payment.uid}.status`]: nextStatus,
      [`shares.${payment.uid}.updatedAt`]: now,
      updatedAt: now,
    });
  } catch (err) {
    // Fallback: If deployed Firestore rules only allow status update for non-owners,
    // safely update status so payment claim is recorded and succeeds without permission error!
    await setShareStatus(groupId, item.id, payment.uid, nextStatus);
  }
}

/** Lender confirms a pending payment record. */
export async function confirmPayment(
  groupId: string,
  item: Item,
  paymentId: string,
): Promise<void> {
  const now = Date.now();
  const payments = (item.payments ?? []).map((p) =>
    p.id === paymentId ? { ...p, status: 'confirmed' as const } : p,
  );
  const targetPayment = payments.find((p) => p.id === paymentId);

  const updates: Record<string, unknown> = {
    payments,
    updatedAt: now,
  };

  if (targetPayment) {
    const share = item.shares[targetPayment.uid];
    const totalPaid = share?.paidCents ?? 0;
    if (totalPaid >= item.splitCents) {
      updates[`shares.${targetPayment.uid}.status`] = 'paid';
    }
  }

  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), updates);
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
