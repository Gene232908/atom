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
import type { Item, Share, ShareStatus } from '../lib/types';

/** Safety cap so a single list can never use up the daily free reads. */
const MAX_ITEMS = 300;

export interface ItemInput {
  description: string;
  priceCents: number;
  splitCents: number;
  shares: Record<string, Share>;
  dueDate: string | null;
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
  await addDoc(itemsRef(groupId), { ...input, createdAt: now, updatedAt: now });
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

export function setShareStatus(
  groupId: string,
  itemId: string,
  uid: string,
  status: ShareStatus,
): Promise<void> {
  const now = Date.now();
  return updateDoc(doc(db, 'groups', groupId, 'items', itemId), {
    [`shares.${uid}.status`]: status,
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
