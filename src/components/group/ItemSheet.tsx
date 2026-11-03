import { useMemo } from 'react';
import { CalendarClock, Pencil, ShoppingBag } from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { dueInfo, isItemDone, itemProgress } from '../../lib/items';
import type { Group, Item, ShareStatus } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { WalletCard } from '../ui/WalletCard';
import { ShareRow } from './ShareRow';

interface Props {
  item: Item | null;
  group: Group;
  uid: string;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onPay: (item: Item) => void;
  onSetStatus: (item: Item, personUid: string, status: ShareStatus) => void;
}

/** Everything about one item, plus who has paid and who has not. */
export function ItemSheet({ item, group, uid, onClose, onEdit, onPay, onSetStatus }: Props) {
  const people = useMemo(() => {
    if (!item) return [];
    const rank = (pid: string, status: ShareStatus) =>
      pid === uid ? 0 : pid === group.ownerId ? 3 : status === 'paid' ? 2 : 1;
    return Object.entries(item.shares).sort(
      ([a, sa], [b, sb]) => rank(a, sa.status) - rank(b, sb.status) || sa.name.localeCompare(sb.name),
    );
  }, [item, uid, group.ownerId]);

  if (!item) return null;
  const isOwner = group.ownerId === uid;
  const done = isItemDone(item, group.ownerId);
  const due = dueInfo(item.dueDate, done);
  const { paid, total } = itemProgress(item, group.ownerId);
  const mine = item.shares[uid];
  const canPay = !isOwner && mine?.status === 'unpaid';

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.description}
      footer={
        isOwner ? (
          <Button size="lg" variant="secondary" full icon={<Pencil className="size-4" />} onClick={() => onEdit(item)}>
            Edit item
          </Button>
        ) : canPay ? (
          <Button size="lg" full onClick={() => onPay(item)}>
            Pay {formatMoney(item.splitCents)} now
          </Button>
        ) : undefined
      }
    >
      <WalletCard seed={item.id} background={storeGradient(item.store, item.id, item.color)} className="p-5">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-[0.12em] uppercase">
            {item.store.trim() || 'Item'}
          </p>
          {due && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold backdrop-blur">
              <CalendarClock className="size-3" />
              {due.text}
            </span>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/70">Price</p>
            <p className="truncate text-[20px] font-bold tabular-nums">{formatMoney(item.priceCents)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-white/70">Split cost (each)</p>
            <p className="truncate text-[20px] font-bold tabular-nums">{formatMoney(item.splitCents)}</p>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] font-medium text-white/80">
              <span>
                {paid} of {total} paid
              </span>
              <span>{Math.round((paid / total) * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${(paid / total) * 100}%` }} />
            </div>
          </div>
        )}
      </WalletCard>

      <p className="mt-5 mb-2 px-1 text-[13px] font-medium text-muted">Split with {people.length} {people.length === 1 ? 'person' : 'people'}</p>
      <div className="overflow-hidden rounded-[20px] bg-white">
        <div className="divide-y divide-hairline">
          {people.map(([pid, share]) => (
            <ShareRow
              key={pid}
              personUid={pid}
              share={share}
              group={group}
              viewerUid={uid}
              onSetStatus={(personUid, status) => onSetStatus(item, personUid, status)}
            />
          ))}
        </div>
      </div>
      {!isOwner && mine?.status === 'claimed' && (
        <p className="mt-3 px-1 text-[13px] text-muted">
          You said you paid. Waiting for the lender to confirm it.
        </p>
      )}
    </Sheet>
  );
}
