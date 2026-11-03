import { useMemo } from 'react';
import { listGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { firstName, otherShares } from '../../lib/items';
import type { Group, Item, Share } from '../../lib/types';
import { WalletCard } from '../ui/WalletCard';
import { AvatarStack } from '../ui/AvatarStack';

interface Props {
  group: Group;
  items: Item[];
  uid: string;
  onPay: () => void;
}

/** The clean loan card at the top of a list */
export function HeroCard({ group, items, uid, onPay }: Props) {
  const isOwner = group.ownerId === uid;
  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');

  const stats = useMemo(() => {
    let owed = 0;
    let unpaid = 0;
    let waiting = 0;
    for (const item of items) {
      const mine = item.shares[uid];
      const shares: Share[] = isOwner
        ? otherShares(item, group.ownerId).map(([, s]) => s)
        : mine
          ? [mine]
          : [];
      for (const s of shares) {
        if (s.status === 'paid') continue;
        owed += item.splitCents;
        unpaid += 1;
        if (s.status === 'claimed') waiting += 1;
      }
    }
    return { owed, unpaid, waiting };
  }, [items, isOwner, group.ownerId, uid]);

  const people = group.memberIds
    .filter((id) => id !== group.ownerId)
    .map((id) => group.members[id])
    .filter(Boolean);
  const hasOtherMembers = people.length > 0;
  const itemsTotal = useMemo(() => items.reduce((sum, it) => sum + it.priceCents, 0), [items]);

  const last4 = group.inviteCode.slice(-4) || '0000';

  const subtitle = isOwner
    ? !hasOtherMembers
      ? items.length > 0
        ? 'Total lent • Waiting for members'
        : 'No members yet • Share invite code'
      : stats.owed > 0
        ? 'Still owed to you'
        : 'All debts settled'
    : stats.owed > 0
      ? `You still owe ${ownerName}`
      : `All paid to ${ownerName}`;

  const displayAmount = isOwner && !hasOtherMembers && itemsTotal > 0
    ? itemsTotal
    : stats.owed;

  return (
    <WalletCard
      seed={group.id}
      background={listGradient(group.id, group.color)}
      interactive={true}
      className="flex min-h-[208px] animate-rise flex-col p-5 sm:min-h-[224px] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-[18px] font-bold text-white drop-shadow-sm">
          {group.name}
        </p>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
          {isOwner ? 'You lend' : `${ownerName} lends`}
        </span>
      </div>

      <p className="mt-4 text-[13px] font-medium text-white/75">
        {subtitle}
      </p>
      <p className="text-[36px] leading-tight font-bold tracking-tight text-white drop-shadow tabular-nums sm:text-[42px]">
        {formatMoney(displayAmount)}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
            {isOwner ? 'You lend' : 'You borrow'}
          </p>
          <p className="mt-0.5 font-mono text-[14px] tracking-[0.18em] text-white/90">
            •••• {last4}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {!isOwner && stats.owed > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPay();
              }}
              className="h-10 shrink-0 rounded-full bg-white px-5 text-[14px] font-bold text-ink shadow-lg shadow-black/25 transition active:scale-95 hover:bg-white/90"
            >
              Pay now
            </button>
          ) : people.length > 0 ? (
            <AvatarStack people={people} />
          ) : isOwner ? (
            <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
              No members yet
            </span>
          ) : null}
        </div>
      </div>
    </WalletCard>
  );
}
