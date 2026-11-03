import { useState, useRef, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listGradient } from '../../lib/cardTheme';
import { navigate } from '../../hooks/useRoute';
import { formatMoney } from '../../lib/money';
import { firstName, sumOwed } from '../../lib/items';
import type { Group } from '../../lib/types';
import { WalletCard } from '../ui/WalletCard';
import { AvatarStack } from '../ui/AvatarStack';

/** One list shown as a loan card (exactly matching the user's approved layout) */
export function GroupWalletCard({ group, uid, index }: { group: Group; uid: string; index: number }) {
  const isOwner = group.ownerId === uid;
  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');
  const amount = isOwner ? sumOwed(group.totals) : (group.totals[uid] ?? 0);
  const people = group.memberIds
    .filter((id) => id !== group.ownerId)
    .map((id) => group.members[id])
    .filter(Boolean);
  const last4 = group.inviteCode.slice(-4) || '0000';

  return (
    <button
      type="button"
      onClick={() => navigate(`/g/${group.id}`)}
      className="block w-full animate-rise text-left transition-transform duration-300 select-none hover:-translate-y-1.5 active:scale-[0.98] focus:outline-none"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <WalletCard
        seed={group.id}
        background={listGradient(group.id, group.color)}
        interactive={true}
        className="flex h-[196px] flex-col p-5 ring-1 ring-white/15"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-white drop-shadow-sm">
            {group.name}
          </p>
          <p className="shrink-0 text-[17px] font-semibold text-white tabular-nums">
            {amount > 0 ? formatMoney(amount) : 'Paid ✓'}
          </p>
        </div>

        <p className="mt-0.5 truncate text-[12px] font-medium text-white/75">
          {isOwner
            ? amount > 0
              ? 'Left to collect'
              : 'Nothing to collect'
            : amount > 0
              ? `You owe ${ownerName}`
              : `All paid to ${ownerName}`}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
              {isOwner ? 'You lend' : 'You borrow'}
            </p>
            <p className="mt-0.5 font-mono text-[15px] tracking-[0.18em] text-white/90">
              •••• {last4}
            </p>
          </div>
          {people.length > 0 && <AvatarStack people={people} />}
        </div>
      </WalletCard>
    </button>
  );
}

/** Stacked like Apple Wallet on phones, a neat grid on tablets and laptops */
export function WalletStack({ groups, uid }: { groups: Group[]; uid: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {groups.map((g, i) => (
        <div key={g.id} className={`relative min-w-0 ${i > 0 ? 'max-sm:-mt-[124px]' : ''}`} style={{ zIndex: i }}>
          <GroupWalletCard group={g} uid={uid} index={i} />
        </div>
      ))}
    </div>
  );
}

/** Single card mode: displays 1 card at a time with smooth swipe left / right */
export function SingleCardCarousel({ groups, uid }: { groups: Group[]; uid: string }) {
  const [index, setIndex] = useState(0);
  const touchStartRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const total = groups.length;
  if (total === 0) return null;
  const current = Math.max(0, Math.min(total - 1, index));
  const group = groups[current];

  const onTouchStart = (e: TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartRef.current === null || touchStartYRef.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current;
    const diffY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartRef.current = null;
    touchStartYRef.current = null;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setIndex((i) => Math.max(0, i - 1));
      } else {
        setIndex((i) => Math.min(total - 1, i + 1));
      }
    }
  };

  return (
    <div className="space-y-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="relative">
        <GroupWalletCard group={group} uid={uid} index={0} />
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between px-2 pt-1">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="flex items-center gap-1 text-[13px] font-semibold text-accent disabled:opacity-20 disabled:pointer-events-none transition active:scale-95"
          >
            <ChevronLeft className="size-4" strokeWidth={2.5} />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-muted">
              {current + 1} of {total}
            </span>
            <div className="flex items-center gap-1.5">
              {groups.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to card ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? 'w-5 bg-ink' : 'w-2 bg-muted/25 hover:bg-muted/45'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={current === total - 1}
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            className="flex items-center gap-1 text-[13px] font-semibold text-accent disabled:opacity-20 disabled:pointer-events-none transition active:scale-95"
          >
            <span>Next</span>
            <ChevronRight className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Unified view respecting the user's chosen layout mode (All Stacked vs 1 at a Time Swipe) */
export function WalletCardsView({
  groups,
  uid,
  mode = 'stack',
}: {
  groups: Group[];
  uid: string;
  mode?: 'stack' | 'single';
}) {
  if (mode === 'single') {
    return <SingleCardCarousel groups={groups} uid={uid} />;
  }
  return <WalletStack groups={groups} uid={uid} />;
}
