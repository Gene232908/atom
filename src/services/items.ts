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
import { cleanRef, confirmedPaid, pendingClaim, withAmountTag } from '../lib/items';
import { computeLoanStats } from '../lib/loanUtils';
import type { Item, PaymentRecord, Share, ShareStatus } from '../lib/types';
import type { User } from 'firebase/auth';

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
  isPersonalLoan?: boolean;
  totalTerms?: number;
  initialPaidTerms?: number;
  initialPaidCents?: number;
  firstDueDate?: string;
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

export async function addItem(groupId: string, input: ItemInput): Promise<string> {
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
  if (input.isPersonalLoan) {
    data.isPersonalLoan = true;
    if (input.totalTerms && input.totalTerms > 0) data.totalTerms = Math.round(input.totalTerms);
    if (typeof input.initialPaidTerms === 'number') data.initialPaidTerms = Math.round(input.initialPaidTerms);
    if (typeof input.initialPaidCents === 'number') data.initialPaidCents = Math.round(input.initialPaidCents);
    if (input.firstDueDate) data.firstDueDate = input.firstDueDate;
  }

  const docRef = await addDoc(itemsRef(groupId), data);
  return docRef.id;
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

  if (input.isPersonalLoan) {
    data.isPersonalLoan = true;
    if (input.totalTerms && input.totalTerms > 0) data.totalTerms = Math.round(input.totalTerms);
    if (typeof input.initialPaidTerms === 'number') data.initialPaidTerms = Math.round(input.initialPaidTerms);
    if (typeof input.initialPaidCents === 'number') data.initialPaidCents = Math.round(input.initialPaidCents);
    if (input.firstDueDate) data.firstDueDate = input.firstDueDate;
  }

  return updateDoc(doc(db, 'groups', groupId, 'items', itemId), data);
}

/** Record a self-loan payment directly with instant confirmation and advance to next due date */
export async function recordLoanPayment(
  groupId: string,
  item: Item,
  user: User,
  payment: {
    amountCents: number;
    refNumber: string;
    paidAt?: number;
    note?: string;
    termsCovered?: number;
    principalCents?: number;
    interestCents?: number;
    daysOverdue?: number;
    paymentType?: 'regular' | 'late' | 'advance';
  },
): Promise<void> {
  const now = Date.now();
  const paidAt = payment.paidAt || now;
  const stats = computeLoanStats(item);

  const termsCovered = payment.termsCovered && payment.termsCovered > 0 ? payment.termsCovered : 1;
  const startTerm = stats.nextTermNumber || stats.currentPaidTerms + 1;
  const endTerm = startTerm + termsCovered - 1;

  const defaultNote =
    termsCovered > 1
      ? `Advance payment for months #${startTerm}–#${endTerm} (${termsCovered} months)`
      : payment.paymentType === 'late' && (payment.daysOverdue ?? 0) > 0
        ? `Payment #${startTerm} of ${stats.totalTerms} (${payment.daysOverdue} days late)`
        : `Payment #${startTerm} of ${stats.totalTerms}`;

  const newPayment: PaymentRecord = {
    id: `loan-pay-${now}`,
    uid: user.uid,
    payerName: user.displayName || 'Me',
    amountCents: Math.round(payment.amountCents),
    refNumber: payment.refNumber.trim() || 'Manual payment',
    paidAt,
    note: payment.note?.trim() || defaultNote,
    status: 'confirmed',
    termNumber: startTerm,
    termsCovered,
    principalCents: payment.principalCents !== undefined ? Math.round(payment.principalCents) : undefined,
    interestCents: payment.interestCents !== undefined ? Math.round(payment.interestCents) : undefined,
    daysOverdue: payment.daysOverdue,
    paymentType: payment.paymentType || (termsCovered > 1 ? 'advance' : 'regular'),
  };

  const existingPayments = Array.isArray(item.payments) ? [...item.payments] : [];
  const updatedPayments = [newPayment, ...existingPayments];

  const updatedStats = computeLoanStats({ ...item, payments: updatedPayments });
  const nextDueDate = updatedStats.isFullyPaid ? null : updatedStats.nextDueDate;

  const updates: Record<string, unknown> = {
    payments: updatedPayments,
    dueDate: nextDueDate,
    [`shares.${user.uid}.paidCents`]: updatedStats.totalPaidCents,
    [`shares.${user.uid}.status`]: updatedStats.isFullyPaid ? 'paid' : 'unpaid',
    [`shares.${user.uid}.refNumber`]: payment.refNumber.trim() || undefined,
    [`shares.${user.uid}.updatedAt`]: now,
    updatedAt: now,
  };

  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), updates);
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
      [`shares.${payment.uid}.refNumber`]: cleanRef(payment.refNumber),
      [`shares.${payment.uid}.updatedAt`]: now,
      updatedAt: now,
    });
    return;
  }

  // Pending: the person says they sent money. The balance does NOT change until the lender says Yes.
  // Add to anything they already sent that is still waiting.
  const claim = pendingClaim(item, payment.uid) + payment.amountCents;
  const tagged = withAmountTag(payment.refNumber, claim);
  const base = {
    [`shares.${payment.uid}.status`]: 'claimed',
    [`shares.${payment.uid}.updatedAt`]: now,
    updatedAt: now,
  };
  // Try the fullest save first. Each next try works with older Firebase rules.
  // Every try keeps the exact amount, so the lender always sees the real value.
  const attempts: Record<string, unknown>[] = [
    { ...base, payments, [`shares.${payment.uid}.claimCents`]: claim, [`shares.${payment.uid}.refNumber`]: tagged },
    { ...base, [`shares.${payment.uid}.claimCents`]: claim, [`shares.${payment.uid}.refNumber`]: tagged },
    { ...base, payments, [`shares.${payment.uid}.refNumber`]: tagged },
    { ...base, [`shares.${payment.uid}.refNumber`]: tagged },
  ];
  let lastError: unknown = null;
  for (const updates of attempts) {
    try {
      await updateDoc(doc(db, 'groups', ref.groupId, 'items', ref.itemId), updates);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
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
  const suggested = pendingClaim(item, uid) || left;
  const amount = Math.min(left, Math.max(0, amountCents ?? suggested));
  if (amount <= 0) return;

  const refNum = cleanRef(share?.refNumber) || 'Confirmed by lender';
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
    [`shares.${uid}.rejectedCents`]: 0,
    [`shares.${uid}.refNumber`]: refNum,
    [`shares.${uid}.updatedAt`]: now,
    updatedAt: now,
  });
}

/**
 * Lender says "No, I did not receive it".
 * The pending payment is removed, the person goes back to unpaid and sees a notice.
 */
export async function rejectPayment(groupId: string, item: Item, uid: string): Promise<void> {
  const now = Date.now();
  const claimed = pendingClaim(item, uid);
  await updateDoc(doc(db, 'groups', groupId, 'items', item.id), {
    payments: (item.payments ?? []).filter((p) => !(p.uid === uid && p.status === 'pending')),
    [`shares.${uid}.status`]: 'unpaid',
    [`shares.${uid}.claimCents`]: 0,
    [`shares.${uid}.rejectedCents`]: claimed || Math.max(0, item.splitCents - confirmedPaid(item, uid)),
    [`shares.${uid}.refNumber`]: '',
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
    [`shares.${uid}.rejectedCents`]: 0,
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

/** Person (not the lender) says they paid everything they still owe. Each item saves its exact amount. */
export async function claimAll(groupId: string, items: Item[], uid: string): Promise<void> {
  for (const item of items) {
    const share = item.shares[uid];
    if (!share || share.status !== 'unpaid') continue;
    const left = Math.max(0, item.splitCents - confirmedPaid(item, uid));
    if (left <= 0) continue;
    await recordPayment(groupId, item, {
      uid,
      payerName: share.name,
      amountCents: left,
      refNumber: 'Paid total',
      note: 'Paid all at once',
      status: 'pending',
    });
  }
}
