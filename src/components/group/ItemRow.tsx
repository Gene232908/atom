import { memo } from 'react';
import { Check, ChevronRight, Clock, ShoppingBag } from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { dueInfo, isItemDone, itemProgress } from '../../lib/items';
import type { Group, Item } from '../../lib/types';

interface Props {
  item: Item;
  group: Group;
  uid: string;
  focusUid: string | null;
  onOpen: (item: Item) => void;
}

/** One line in the item list. Tap it to see all details. */
function ItemRowBase({ item, group, uid, focusUid, onOpen }: Props) {
  const isOwner = group.ownerId === uid;
  const viewer = focusUid ?? (isOwner ? null : uid);
  const share = viewer ? item.shares[viewer] : undefined;
  const { paid, total } = itemProgress(item, group.ownerId);
  const done = share ? share.status === 'paid' : isItemDone(item, group.ownerId);
  const waiting = share
    ? share.status === 'claimed'
    : Object.values(item.shares).some((s) => s.status === 'claimed');
  const due = dueInfo(item.dueDate, done);

  let statusText: string;
  let statusClass: string;
  if (share) {
    statusText = share.status === 'paid' ? 'Paid' : share.status === 'claimed' ? 'Waiting' : 'Not paid';
    statusClass = share.status === 'paid' ? 'text-ok-ink' : share.status === 'claimed' ? 'text-warn-ink' : 'text-bad-ink';
  } else if (viewer) {
    statusText = 'Not included';
    statusClass = 'text-muted';
  } else {
    statusText = done ? 'All paid' : waiting ? 'To confirm' : `${paid} of ${total} paid`;
    statusClass = done ? 'text-ok-ink' : waiting ? 'text-warn-ink' : 'text-muted';
  }

  const amount = share ? item.splitCents : item.priceCents;
  const sub = [item.store.trim(), due?.text ?? `${formatMoney(item.splitCents)} each`].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left transition active:bg-fill"
    >
      <span
        className={`relative grid size-11 shrink-0 place-items-center rounded-[14px] text-white ${done ? 'opacity-60' : ''}`}
        style={{ backgroundImage: storeGradient(item.store, item.id, item.color) }}
      >
        {done ? (
          <Check className="size-5" strokeWidth={2.5} />
        ) : waiting ? (
          <Clock className="size-5" />
        ) : (
          <ShoppingBag className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{item.description}</span>
        <span className={`block truncate text-[13px] ${due && due.tone !== 'slate' ? 'text-bad-ink' : 'text-muted'}`}>
          {sub}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={`block text-[15px] font-semibold tabular-nums ${done ? 'text-muted line-through decoration-1' : ''}`}>
          {formatMoney(amount)}
        </span>
        <span className={`block text-[12px] font-semibold ${statusClass}`}>{statusText}</span>
      </span>
      <ChevronRight className="-mr-1 size-4 shrink-0 text-muted/50 max-[359px]:hidden" strokeWidth={2.5} />
    </button>
  );
}

export const ItemRow = memo(ItemRowBase);
