import { useEffect, useState } from 'react';
import { subscribeItems } from '../services/items';
import type { Group, Item } from '../lib/types';
import { usePageActive } from './usePageActive';

export interface GroupItem extends Item {
  group: Group;
}

/**
 * Real-time listener that aggregates items from all groups the user participates in.
 * Each item has its parent `group` attached.
 */
export function useAllItems(groups: Group[]) {
  const active = usePageActive();
  const [itemsByGroup, setItemsByGroup] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);

  // Prune any deleted groups from state immediately so counts update instantly
  useEffect(() => {
    const validGids = new Set(groups.map((g) => g.id));
    setItemsByGroup((prev) => {
      let changed = false;
      const next: Record<string, Item[]> = {};
      for (const [gid, list] of Object.entries(prev)) {
        if (validGids.has(gid)) {
          next[gid] = list;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [groups]);

  useEffect(() => {
    if (!active || groups.length === 0) {
      setItemsByGroup({});
      setLoading(false);
      return;
    }

    let activeCount = groups.length;
    const unsubscribes: (() => void)[] = [];

    for (const group of groups) {
      const unsub = subscribeItems(
        group.id,
        (items) => {
          setItemsByGroup((prev) => ({ ...prev, [group.id]: items }));
          activeCount -= 1;
          if (activeCount <= 0) setLoading(false);
        },
        () => {
          activeCount -= 1;
          if (activeCount <= 0) setLoading(false);
        },
      );
      unsubscribes.push(unsub);
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [active, groups]);

  const allItems: GroupItem[] = [];
  const groupMap = new Map(groups.map((g) => [g.id, g]));

  for (const [gid, list] of Object.entries(itemsByGroup)) {
    const parentGroup = groupMap.get(gid);
    if (!parentGroup) continue;
    for (const item of list) {
      allItems.push({ ...item, group: parentGroup });
    }
  }

  return { items: allItems, loading };
}
