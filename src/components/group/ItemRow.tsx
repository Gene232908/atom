import { memo } from 'react';
import { ChevronRight } from 'lucide-react';
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

/** Formatted transaction row matching Apple Wallet layout (Image 1) with high readability */
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

  let statusText = '';
  let statusColor = '';

  if (share) {
    if (share.status === 'paid') {
      statusText = 'Paid';
      statusColor = 'text-ok-ink';
    } else if (share.status === 'claimed') {
      statusText = 'Waiting confirmation';
      statusColor = 'text-warn-ink';
    } else if (share.paidCents && share.paidCents > 0) {
      statusText = `Partial · ${formatMoney(share.paidCents)} paid`;
      statusColor = 'text-accent';
    } else {
      statusText = 'Not paid';
      statusColor = 'text-bad-ink';
    }
  } else if (viewer) {
    statusText = 'Not included';
    statusColor = 'text-muted';
  } else {
    if (total === 0) {
      statusText = 'Waiting for members';
      statusColor = 'text-warn-ink';
    } else if (done) {
      statusText = 'All paid';
      statusColor = 'text-ok-ink';
    } else if (waiting) {
      // Show amount received when waiting for confirmation
      const received = Object.values(item.shares).reduce((sum, s) => sum + (s.paidCents ?? 0), 0);
      statusText = received > 0 ? `${formatMoney(received)} received, waiting` : 'Waiting confirmation';
      statusColor = 'text-warn-ink';
    } else {
      statusText = `${paid} of ${total} paid`;
      statusColor = 'text-muted';
    }
  }

  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
    : '';
  const dateOrDue = due?.text ? due.text : dateStr;
  const storeLabel = item.store.trim();

  const amount = share ? item.splitCents : item.priceCents;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3.5 text-left transition select-none active:bg-fill"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">
          {item.description || storeLabel || 'Transaction'}
        </p>

        <p className={`mt-0.5 text-[13px] font-medium ${statusColor}`}>
          {statusText}
        </p>

        <p className="text-[12px] text-muted">
          {[storeLabel, dateOrDue].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`text-[14px] font-semibold tabular-nums text-right ${
            done ? 'text-muted line-through' : 'text-ink'
          }`}
        >
          {formatMoney(amount)}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted/60" strokeWidth={2.5} />
      </div>
    </button>
  );
}

export const ItemRow = memo(ItemRowBase);
