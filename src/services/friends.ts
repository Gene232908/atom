import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Friendship, UserProfile } from '../lib/types';

/**
 * Saves or updates user's searchable public profile in Firestore.
 * Allows friends to look up each other by User ID or Email.
 */
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  const ref = doc(db, 'users', user.uid);
  const data: UserProfile = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Friend',
    email: (user.email || '').toLowerCase().trim(),
    photo: user.photoURL || '',
    updatedAt: Date.now(),
  };
  await setDoc(ref, data, { merge: true });
}

/**
 * Looks up another user by exact User ID (UID) or Email address.
 */
export async function searchUser(
  rawQuery: string,
  currentUid: string,
): Promise<{ user: UserProfile | null; error?: string }> {
  const qStr = rawQuery.trim();
  if (!qStr) return { user: null, error: 'Please enter a User ID or email.' };
  if (qStr === currentUid) {
    return { user: null, error: 'That is your own User ID!' };
  }

  try {
    // 1. Direct UID lookup
    const docSnap = await getDoc(doc(db, 'users', qStr));
    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;
      if (data.uid === currentUid) return { user: null, error: 'That is your own User ID!' };
      return { user: data };
    }

    // 2. Email lookup (case-insensitive exact match)
    const emailQ = query(collection(db, 'users'), where('email', '==', qStr.toLowerCase()));
    const emailSnap = await getDocs(emailQ);
    if (!emailSnap.empty) {
      const matchDoc = emailSnap.docs[0];
      const data = matchDoc.data() as UserProfile;
      if (data.uid === currentUid) return { user: null, error: 'That is your own email!' };
      return { user: data };
    }

    return { user: null, error: 'No user found with that ID or email. Please check and try again.' };
  } catch (err: any) {
    console.error('Error searching user:', err);
    return { user: null, error: err.message || 'Search failed. Please try again.' };
  }
}

/**
 * Deterministic Friendship ID between two UIDs: [uidA, uidB].sort().join('_')
 */
export function getFriendshipId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

/**
 * Listens to all friendships and incoming/outgoing friend requests for the current user.
 */
export function subscribeFriendships(
  currentUid: string,
  onData: (friendships: Friendship[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const q = query(collection(db, 'friendships'), where('users', 'array-contains', currentUid));
  return onSnapshot(
    q,
    (snap) => {
      const list: Friendship[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          users: data.users || [],
          userProfiles: data.userProfiles || {},
          status: data.status || 'pending',
          senderUid: data.senderUid || '',
          createdAt: data.createdAt || 0,
          updatedAt: data.updatedAt || 0,
        };
      });
      // Sort newest first
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      onData(list);
    },
    (err) => {
      console.warn('Friendships subscription error:', err);
      if (onError) onError(err);
    },
  );
}

/**
 * Sends a friend request (or auto-accepts if the other party already requested).
 */
export async function sendFriendRequest(currentUser: User, target: UserProfile): Promise<'sent' | 'accepted'> {
  const fid = getFriendshipId(currentUser.uid, target.uid);
  const existing = await getDoc(doc(db, 'friendships', fid));

  const myProfile = {
    name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Friend',
    email: currentUser.email || '',
    photo: currentUser.photoURL || '',
  };
  const targetProfile = {
    name: target.name || 'Friend',
    email: target.email || '',
    photo: target.photo || '',
  };

  const now = Date.now();

  if (existing.exists()) {
    const data = existing.data();
    if (data.status === 'accepted') {
      return 'accepted';
    }
    // If other user sent it to me, my request auto-accepts it!
    if (data.senderUid === target.uid) {
      await updateDoc(doc(db, 'friendships', fid), {
        status: 'accepted',
        [`userProfiles.${currentUser.uid}`]: myProfile,
        [`userProfiles.${target.uid}`]: targetProfile,
        updatedAt: now,
      });
      return 'accepted';
    }
  }

  // New or re-send request
  await setDoc(
    doc(db, 'friendships', fid),
    {
      id: fid,
      users: [currentUser.uid, target.uid],
      userProfiles: {
        [currentUser.uid]: myProfile,
        [target.uid]: targetProfile,
      },
      status: 'pending',
      senderUid: currentUser.uid,
      createdAt: now,
      updatedAt: now,
    },
    { merge: true },
  );

  return 'sent';
}

/**
 * Accepts an incoming friend request.
 */
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status: 'accepted',
    updatedAt: Date.now(),
  });
}

/**
 * Declines a friend request or unfriends a contact.
 */
export async function removeFriendship(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId));
}
