import type { User } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toGroup, toInvite } from '../lib/convert';
import type { Group, Invite } from '../lib/types';
import { sendPushNotificationToUser } from '../lib/notifications';

const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeInviteCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_LETTERS[b % CODE_LETTERS.length]).join('');
}

function memberFromUser(user: User) {
  return {
    name: user.displayName || user.email?.split('@')[0] || 'Someone',
    email: user.email ?? '',
    photo: user.photoURL ?? '',
    joinedAt: Date.now(),
  };
}

/** One live listener for all lists the user belongs to. */
export function subscribeGroups(
  uid: string,
  onData: (groups: Group[]) => void,
  onError: (err: unknown) => void,
): () => void {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const groups = snap.docs.map((d) => toGroup(d.id, d.data()));
      groups.sort((a, b) => b.createdAt - a.createdAt);
      onData(groups);
    },
    onError,
  );
}

/** Creates a list or personal loan. Returns the new id right away; `saved` finishes when the server confirms. */
export function createGroup(
  user: User,
  name: string,
  color = '',
  groupType: 'shared' | 'loan' = 'shared',
): { id: string; saved: Promise<void> } {
  const ref = doc(collection(db, 'groups'));
  const code = makeInviteCode();
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(ref, {
    name,
    ownerId: user.uid,
    memberIds: [user.uid],
    members: { [user.uid]: memberFromUser(user) },
    inviteCode: code,
    paymentNote: '',
    hasQr: false,
    color,
    totals: {},
    groupType,
    createdAt: now,
    updatedAt: now,
  });
  if (groupType === 'shared') {
    batch.set(doc(db, 'invites', code), {
      groupId: ref.id,
      groupName: name,
      ownerName: user.displayName || 'Someone',
    });
  }
  return { id: ref.id, saved: batch.commit() };
}

export async function fetchInvite(code: string): Promise<Invite | null> {
  const snap = await getDoc(doc(db, 'invites', code));
  return snap.exists() ? toInvite(snap.data()) : null;
}

export async function joinGroup(user: User, groupId: string, code: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayUnion(user.uid),
    [`members.${user.uid}`]: { ...memberFromUser(user), code, status: 'accepted' },
  });
}

/**
 * Lender directly adds a friend as a member to the group card.
 * Member starts with status: 'pending' so lender can immediately assign items and splits.
 */
export async function inviteFriendToGroup(
  groupId: string,
  friend: { uid: string; name: string; email: string; photo: string },
  currentUid: string,
  groupName?: string,
  inviterName?: string,
): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayUnion(friend.uid),
    [`members.${friend.uid}`]: {
      name: friend.name,
      email: friend.email,
      photo: friend.photo,
      joinedAt: Date.now(),
      status: 'pending',
      invitedBy: currentUid,
    },
    updatedAt: Date.now(),
  });

  // Dispatch background push directly to friend's locked phone
  sendPushNotificationToUser(friend.uid, {
    title: 'New Card Invitation',
    body: `${inviterName || 'A friend'} invited you to join "${groupName || 'Card'}". Tap to review and accept!`,
    url: '/',
    targetTab: 'owe',
    tag: `card_invite_${groupId}`,
    groupId,
  }).catch((err) => console.warn('Card invite push error:', err));
}

/**
 * Payee / friend accepts the card invitation.
 * Their status becomes 'accepted', activating the card in their "You Owe".
 */
export async function acceptGroupInvite(groupId: string, uid: string, memberName?: string): Promise<void> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  await updateDoc(doc(db, 'groups', groupId), {
    [`members.${uid}.status`]: 'accepted',
    updatedAt: Date.now(),
  });

  if (snap.exists()) {
    const data = snap.data();
    if (data.ownerId && data.ownerId !== uid) {
      sendPushNotificationToUser(data.ownerId, {
        title: 'Invitation Accepted',
        body: `${memberName || 'Your friend'} accepted your invite to "${data.name}".`,
        url: `/g/${groupId}`,
        tag: `card_acc_${groupId}`,
        groupId,
      }).catch((err) => console.warn('Push error:', err));
    }
  }
}

/**
 * Payee declines or lender removes a member from the group card.
 */
export async function declineGroupInvite(groupId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    memberIds: arrayRemove(uid),
    [`members.${uid}`]: deleteField(),
    updatedAt: Date.now(),
  });
}

export function removeMember(groupId: string, uid: string): Promise<void> {
  return declineGroupInvite(groupId, uid);
}

export function saveTotals(groupId: string, totals: Record<string, number>): Promise<void> {
  return updateDoc(doc(db, 'groups', groupId), { totals });
}

export interface GroupSettings {
  name: string;
  paymentNote: string;
  /** string = new picture, null = remove picture, undefined = keep as is */
  qr: string | null | undefined;
  color: string;
}

export function saveGroupSettings(group: Group, settings: GroupSettings): Promise<void> {
  const now = Date.now();
  const batch = writeBatch(db);
  const changes: Record<string, unknown> = {
    name: settings.name,
    paymentNote: settings.paymentNote,
    color: settings.color,
    updatedAt: now,
  };
  if (settings.qr !== undefined) changes.hasQr = settings.qr !== null;
  batch.update(doc(db, 'groups', group.id), changes);

  if (settings.name !== group.name && group.inviteCode) {
    batch.update(doc(db, 'invites', group.inviteCode), { groupName: settings.name });
  }
  if (typeof settings.qr === 'string') {
    batch.set(doc(db, 'qr', group.id), { image: settings.qr, updatedAt: now });
  } else if (settings.qr === null) {
    batch.delete(doc(db, 'qr', group.id));
  }
  return batch.commit();
}

export async function loadQr(groupId: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'qr', groupId));
  const image = snap.exists() ? snap.data().image : null;
  return typeof image === 'string' ? image : null;
}

/** Deletes a list together with all its items, its invite and its QR picture. */
export async function deleteGroup(group: Group): Promise<void> {
  // 1. Delete all items in the subcollection
  try {
    const items = await getDocs(collection(db, 'groups', group.id, 'items'));
    for (const d of items.docs) {
      await deleteDoc(d.ref).catch(() => undefined);
    }
  } catch (err) {
    console.warn('Error deleting sub-items:', err);
  }

  // 2. Delete invite code if shared group
  if (group.groupType !== 'loan' && group.inviteCode) {
    try {
      await deleteDoc(doc(db, 'invites', group.inviteCode)).catch(() => undefined);
    } catch {
      // Ignore if invite doesn't exist
    }
  }

  // 3. Delete QR picture if exists
  if (group.hasQr) {
    try {
      await deleteDoc(doc(db, 'qr', group.id)).catch(() => undefined);
    } catch {
      // Ignore
    }
  }

  // 4. Always delete the parent group document
  await deleteDoc(doc(db, 'groups', group.id));
}
