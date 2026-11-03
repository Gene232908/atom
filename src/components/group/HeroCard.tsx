import { listGradient } from '../../lib/cardTheme';
import { useMemo } from 'react';
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

/** The big card at the top of a list: how much is still owed. */
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

  return (
    <WalletCard seed={group.id} background={listGradient(group.id, group.color)} className="flex min-h-[208px] animate-rise flex-col p-5 sm:min-h-[224px] sm:p-6">
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">{group.name}</p>
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">
          {isOwner ? 'You lend' : `${ownerName} lends`}
        </span>
      </div>

      <p className="mt-5 text-[13px] font-medium text-white/75">
        {isOwner ? 'Still owed to you' : `You still owe ${ownerName}`}
      </p>
      <p className="text-[38px] leading-tight font-bold tracking-tight tabular-nums wrap-break-word sm:text-[44px]">
        {formatMoney(stats.owed)}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <p className="min-w-0 text-[12px] font-medium text-white/80">
          {stats.unpaid === 0
            ? isOwner
              ? 'Nothing to collect'
              : 'All paid up. Nice!'
            : `${stats.unpaid} unpaid${stats.waiting ? ` · ${stats.waiting} waiting` : ''}`}
        </p>
        {!isOwner && stats.owed > 0 ? (
          <button
            type="button"
            onClick={onPay}
            className="h-10 shrink-0 rounded-full bg-white px-5 text-[14px] font-semibold text-ink shadow-lg shadow-black/20 transition active:scale-95"
          >
            Pay now
          </button>
        ) : (
          people.length > 0 && <AvatarStack people={people} />
        )}
      </div>
    </WalletCard>
  );
}
