import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { subscribeGroups } from '../services/groups';
import { friendlyError } from '../lib/errors';
import type { Group } from '../lib/types';
import { usePageActive } from './usePageActive';

interface GroupsValue {
  groups: Group[];
  loading: boolean;
  error: string;
  retry: () => void;
}

const GroupsContext = createContext<GroupsValue | null>(null);

/** Keeps ONE live listener for all of the user's lists, shared by every screen. */
export function GroupsProvider({ uid, children }: { uid: string; children: ReactNode }) {
  const active = usePageActive();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    setError('');
    return subscribeGroups(
      uid,
      (next) => {
        setGroups(next);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      },
    );
  }, [uid, active, attempt]);

  const value = useMemo(
    () => ({ groups, loading, error, retry: () => setAttempt((n) => n + 1) }),
    [groups, loading, error],
  );

  return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>;
}

export function useGroups(): GroupsValue {
  const ctx = useContext(GroupsContext);
  if (!ctx) throw new Error('useGroups must be used inside GroupsProvider');
  return ctx;
}
