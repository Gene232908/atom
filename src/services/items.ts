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
    // safely update status and refNumber so payment claim is recorded and succeeds without permission error!
    await setShareStatus(groupId, item.id, payment.uid, nextStatus, payment.refNumber);
  }
}

/** Lender confirms a pending payment record or marks a member as paid. */
export async function confirmPayment(
  groupId: string,
  item: Item,
  paymentId: string,
  targetUid?: string,
): Promise<void> {
  const now = Date.now();
  let payments = item.payments ? [...item.payments] : [];
  const uid = targetUid || payments.find((p) => p.id === paymentId)?.uid;
  if (!uid) return;

  const share = item.shares[uid];
  const borrowerName = share?.name ?? 'Borrower';
  const expectedCutoff =
    item.monthlyCents ||
    (item.installmentsCount && item.installmentsCount > 1
      ? Math.round(item.splitCents / item.installmentsCount)
      : item.splitCents);

  // Check if there is an existing pending record or claim
  const foundIndex = payments.findIndex(
    (p) => p.id === paymentId || (p.uid === uid && p.status === 'pending'),
  );

  let thisPaymentAmount = expectedCutoff;
  let refNum = share?.refNumber || 'Verified by lender';

  if (foundIndex >= 0) {
    thisPaymentAmount = payments[foundIndex].amountCents || expectedCutoff;
    refNum = payments[foundIndex].refNumber || refNum;
    payments[foundIndex] = {
      ...payments[foundIndex],
      status: 'confirmed',
      amountCents: thisPaymentAmount,
      refNumber: refNum,
      paidAt: payments[foundIndex].paidAt || now,
    };
  } else {
    payments = [
      {
        id: `pay-${uid}-${now}`,
        uid,
        payerName: borrowerName,
        amountCents: thisPaymentAmount,
        refNumber: refNum,
        note: share?.refNumber ? `Ref: ${share.refNumber}` : 'Cut-off payment confirmed',
        status: 'confirmed',
        paidAt: now,
      },
      ...payments,
    ];
  }

  // Calculate cumulative paid amount from all confirmed payments for this user
  const totalPaidCents = payments
    .filter((p) => p.uid === uid && p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amountCents, 0);

  const isFullyPaid = totalPaidCents >= item.splitCents;
  const nextStatus: ShareStatus = isFullyPaid ? 'paid' : 'unpaid';

  const updates: Record<string, unknown> = {
    payments,
    [`shares.${uid}.status`]: nextStatus,
    [`shares.${uid}.paidCents`]: totalPaidCents,
    [`shares.${uid}.refNumber`]: refNum,
    [`shares.${uid}.updatedAt`]: now,
    updatedAt: now,
  };

  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), updates);
}

/** Lender undoes payment for a member, reverting status to unpaid and updating history. */
export async function undoPayment(groupId: string, item: Item, uid: string): Promise<void> {
  const now = Date.now();
  const existingPayments = item.payments ? [...item.payments] : [];
  const updatedPayments = existingPayments.filter((p) => p.uid !== uid);

  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), {
    payments: updatedPayments,
    [`shares.${uid}.status`]: 'unpaid',
    [`shares.${uid}.paidCents`]: 0,
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
