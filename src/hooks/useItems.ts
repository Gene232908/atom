import { useEffect, useState } from 'react';
import { subscribeItems } from '../services/items';
import { friendlyError } from '../lib/errors';
import type { Item } from '../lib/types';
import { usePageActive } from './usePageActive';

export function useItems(groupId: string) {
  const active = usePageActive();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromServer, setFromServer] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) return;
    setError('');
    return subscribeItems(
      groupId,
      (next, server) => {
        setItems(next);
        setFromServer(server);
        setLoading(false);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      },
    );
  }, [groupId, active, attempt]);

  return { items, loading, fromServer, error, retry: () => setAttempt((n) => n + 1) };
}
