import { useEffect, useRef, useState } from 'react';
import { subscribeItems } from '../services/items';
import { friendlyError } from '../lib/errors';
import type { Item } from '../lib/types';
import { usePageActive } from './usePageActive';

export function useItems(groupId: string, isOwner = false) {
  const active = usePageActive();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromServer, setFromServer] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const retryCountRef = useRef(0);
  const prevGroupIdRef = useRef(groupId);

  if (prevGroupIdRef.current !== groupId) {
    prevGroupIdRef.current = groupId;
    retryCountRef.current = 0;
  }

  useEffect(() => {
    if (!active || !groupId) return;
    let timer: number | null = null;
    let cancelled = false;

    const unsubscribe = subscribeItems(
      groupId,
      (next, server) => {
        if (cancelled) return;
        retryCountRef.current = 0;
        setItems(next);
        setFromServer(server);
        setLoading(false);
        setError('');
      },
      (err) => {
        if (cancelled) return;
        const code = friendlyError(err);
        const rawCode = String(err && typeof err === 'object' && 'code' in err ? (err as { code: unknown }).code : '');
        const isPermission = rawCode.includes('permission-denied') || code.includes('not allowed');

        // Newly created groups / Firestore cross-document rule sync:
        // Rule evaluation using `get(/databases/.../groups/$(gid))` can have a 500ms-2s propagation lag.
        // Retry silently up to 5 times (400ms, 700ms, 1100ms, 1600ms, 2200ms) before showing any error.
        if (isPermission && retryCountRef.current < 5) {
          retryCountRef.current += 1;
          const delay = [400, 700, 1100, 1600, 2200][retryCountRef.current - 1] ?? 1500;
          timer = window.setTimeout(() => {
            if (!cancelled) {
              setAttempt((n) => n + 1);
            }
          }, delay);
          return;
        }

        // If it's the owner, they can never be removed from their own list.
        if (isOwner && isPermission) {
          setError('Connecting to list items... Tap try again if it does not load.');
        } else {
          setError(code);
        }
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [groupId, active, attempt, isOwner]);

  return {
    items,
    loading,
    fromServer,
    error,
    retry: () => {
      retryCountRef.current = 0;
      setError('');
      setLoading(true);
      setAttempt((n) => n + 1);
    },
  };
}
