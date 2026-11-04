import { useEffect, useMemo, useState } from 'react';
import { useUser } from './useAuth';
import { subscribeFriendships, syncUserProfile } from '../services/friends';
import type { Friendship } from '../lib/types';

export interface FriendContact {
  friendshipId: string;
  uid: string;
  name: string;
  email: string;
  photo: string;
}

export function useFriends() {
  const user = useUser();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep public profile updated for friends to find
  useEffect(() => {
    if (user.uid) {
      syncUserProfile(user).catch((err) => console.warn('Failed to sync user profile:', err));
    }
  }, [user]);

  // Subscribe to live friendships
  useEffect(() => {
    if (!user.uid) return;
    const unsub = subscribeFriendships(
      user.uid,
      (list) => {
        setFriendships(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user.uid]);

  // Derived: active accepted friends
  const friends = useMemo<FriendContact[]>(() => {
    return friendships
      .filter((f) => f.status === 'accepted')
      .map((f) => {
        const otherUid = f.users.find((u) => u !== user.uid) || '';
        const profile = f.userProfiles[otherUid] || { name: 'Friend', email: '', photo: '' };
        return {
          friendshipId: f.id,
          uid: otherUid,
          name: profile.name || 'Friend',
          email: profile.email || '',
          photo: profile.photo || '',
        };
      })
      .filter((p) => Boolean(p.uid));
  }, [friendships, user.uid]);

  // Derived: incoming requests waiting for this user to accept
  const incomingRequests = useMemo<FriendContact[]>(() => {
    return friendships
      .filter((f) => f.status === 'pending' && f.senderUid !== user.uid)
      .map((f) => {
        const otherUid = f.senderUid;
        const profile = f.userProfiles[otherUid] || { name: 'Someone', email: '', photo: '' };
        return {
          friendshipId: f.id,
          uid: otherUid,
          name: profile.name || 'Someone',
          email: profile.email || '',
          photo: profile.photo || '',
        };
      });
  }, [friendships, user.uid]);

  // Derived: outgoing requests waiting for the other party
  const outgoingRequests = useMemo<FriendContact[]>(() => {
    return friendships
      .filter((f) => f.status === 'pending' && f.senderUid === user.uid)
      .map((f) => {
        const otherUid = f.users.find((u) => u !== user.uid) || '';
        const profile = f.userProfiles[otherUid] || { name: 'Someone', email: '', photo: '' };
        return {
          friendshipId: f.id,
          uid: otherUid,
          name: profile.name || 'Someone',
          email: profile.email || '',
          photo: profile.photo || '',
        };
      });
  }, [friendships, user.uid]);

  return {
    friendships,
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    totalCount: friends.length,
    requestsCount: incomingRequests.length,
  };
}
