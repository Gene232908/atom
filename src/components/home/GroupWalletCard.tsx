import { useState, useRef } from 'react';
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

  const hasOtherMembers = people.length > 0;

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
            {amount > 0 ? formatMoney(amount) : isOwner && !hasOtherMembers ? 'No members' : 'Paid ✓'}
          </p>
        </div>

        <p className="mt-0.5 truncate text-[12px] font-medium text-white/75">
          {isOwner
            ? !hasOtherMembers
              ? 'Waiting for members to join'
              : amount > 0
                ? 'Left to collect'
                : 'All debts settled'
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
          {people.length > 0 ? (
            <AvatarStack people={people} />
          ) : isOwner ? (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur">
              Waiting to join
            </span>
          ) : null}
        </div>
      </WalletCard>
    </button>
  );
}

/** Stacked like Apple Wallet on phones, a neat grid on tablets and laptops */
export function WalletStack({ groups, uid }: { groups: Group[]; uid: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {groups.map((g, i) => (
        <div key={g.id} className={`relative min-w-0 ${i > 0 ? 'max-sm:-mt-[124px]' : ''}`} style={{ zIndex: i }}>
          <GroupWalletCard group={g} uid={uid} index={i} />
        </div>
      ))}
    </div>
  );
}

/** Single card item inside the 3D deck */
function DeckCardItem({
  group,
  uid,
  isFront,
}: {
  group: Group;
  uid: string;
  isFront: boolean;
}) {
  const isOwner = group.ownerId === uid;
  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');
  const amount = isOwner ? sumOwed(group.totals) : (group.totals[uid] ?? 0);
  const people = group.memberIds
    .filter((id) => id !== group.ownerId)
    .map((id) => group.members[id])
    .filter(Boolean);
  const last4 = group.inviteCode.slice(-4) || '0000';
  const hasOtherMembers = people.length > 0;

  return (
    <WalletCard
      seed={group.id}
      background={listGradient(group.id, group.color)}
      interactive={isFront}
      className="flex h-[196px] flex-col p-5 ring-1 ring-white/15 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-white drop-shadow-sm">
          {group.name}
        </p>
        <p className="shrink-0 text-[17px] font-semibold text-white tabular-nums">
          {amount > 0 ? formatMoney(amount) : isOwner && !hasOtherMembers ? 'No members' : 'Paid ✓'}
        </p>
      </div>

      <p className="mt-0.5 truncate text-[12px] font-medium text-white/75">
        {isOwner
          ? !hasOtherMembers
            ? 'Waiting for members to join'
            : amount > 0
              ? 'Left to collect'
              : 'All debts settled'
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
        {people.length > 0 ? (
          <AvatarStack people={people} />
        ) : isOwner ? (
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur">
            Waiting to join
          </span>
        ) : null}
      </div>
    </WalletCard>
  );
}

/** 3D stacked card deck: cards behind peek out; swipe left/right flips & cycles seamlessly */
export function SingleCardCarousel({ groups, uid }: { groups: Group[]; uid: string }) {
  const [current, setCurrent] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isSwipingRef = useRef<boolean | null>(null);
  const currentDragXRef = useRef(0);
  const didMoveRef = useRef(false);

  const total = groups.length;
  if (total === 0) return null;

  const activeIndex = ((current % total) + total) % total;

  const onTouchStart = (e: React.TouchEvent) => {
    if (total <= 1) return;
    const touch = e.touches[0];
    startXRef.current = touch.clientX;
    startYRef.current = touch.clientY;
    startTimeRef.current = Date.now();
    isSwipingRef.current = null;
    currentDragXRef.current = 0;
    didMoveRef.current = false;
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || total <= 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    if (isSwipingRef.current === null) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < 8 && absY < 8) return;

      if (absY > absX) {
        // Vertical scroll: cancel horizontal swipe and let browser scroll naturally
        isSwipingRef.current = false;
        setIsDragging(false);
        setDragX(0);
        return;
      }
      isSwipingRef.current = true;
    }

    if (isSwipingRef.current === true) {
      didMoveRef.current = true;
      currentDragXRef.current = dx;
      setDragX(dx);
    }
  };

  const onTouchEnd = () => {
    if (!isDragging && !didMoveRef.current) return;
    setIsDragging(false);

    if (isSwipingRef.current === true) {
      const dx = currentDragXRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      const velocity = Math.abs(dx) / (elapsed || 1);

      if (Math.abs(dx) > 60 || velocity > 0.35) {
        if (dx < 0) {
          setCurrent((i) => (i + 1) % total);
        } else {
          setCurrent((i) => (i - 1 + total) % total);
        }
      }
    }
    setDragX(0);
    currentDragXRef.current = 0;
    isSwipingRef.current = null;
    setTimeout(() => {
      didMoveRef.current = false;
    }, 50);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (total <= 1) return;
    startXRef.current = e.clientX;
    startTimeRef.current = Date.now();
    currentDragXRef.current = 0;
    didMoveRef.current = false;
    setIsDragging(true);

    const onPointerMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startXRef.current;
      if (Math.abs(dx) > 6) {
        didMoveRef.current = true;
      }
      currentDragXRef.current = dx;
      setDragX(dx);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDragging(false);

      const dx = currentDragXRef.current;
      const elapsed = Date.now() - startTimeRef.current;
      const velocity = Math.abs(dx) / (elapsed || 1);

      if (Math.abs(dx) > 60 || velocity > 0.35) {
        if (dx < 0) {
          setCurrent((i) => (i + 1) % total);
        } else {
          setCurrent((i) => (i - 1 + total) % total);
        }
      }
      setDragX(0);
      currentDragXRef.current = 0;
      setTimeout(() => {
        didMoveRef.current = false;
      }, 50);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleCardClick = (group: Group, rel: number) => {
    if (didMoveRef.current || Math.abs(currentDragXRef.current) > 8) return;
    if (rel === 0) {
      navigate(`/g/${group.id}`);
    } else {
      setCurrent((i) => (i + rel) % total);
    }
  };

  const dragProgress = Math.min(1, Math.abs(dragX) / 140);
  const isSwipeLeft = isDragging && dragX < 0;
  const isSwipeRight = isDragging && dragX > 0;

  return (
    <div
      className="relative w-full pt-1 pb-2 select-none touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onPointerDown={onPointerDown}
    >
      <div className="relative mx-auto w-full max-w-[420px] h-[224px]">
        {groups.map((group, i) => {
          const rel = (i - activeIndex + total) % total;

          // Only render visible cards in stack: current, next 2 cards, and previous card
          const isVisible = rel === 0 || rel === 1 || rel === 2 || rel === total - 1;
          if (!isVisible) return null;

          let transform = '';
          let opacity = 0;
          let zIndex = 0;
          let filter = 'none';

          if (rel === 0) {
            // Front Card
            zIndex = 30;
            if (isDragging) {
              const rot = dragX * 0.04;
              transform = `translate3d(${dragX}px, 0, 0) rotateZ(${rot}deg) scale(1)`;
              opacity = 1 - Math.min(0.35, (Math.abs(dragX) / 320) * 0.35);
            } else {
              transform = 'translate3d(0, 0, 0) rotateZ(0deg) scale(1)';
              opacity = 1;
            }
          } else if (rel === 1) {
            // Card 1 behind (steps up when swiping left)
            zIndex = 20;
            if (isSwipeLeft) {
              const y = 14 - dragProgress * 14;
              const s = 0.96 + dragProgress * 0.04;
              transform = `translate3d(0, ${y}px, 0) scale(${s})`;
              opacity = 0.85 + dragProgress * 0.15;
              filter = `brightness(${0.93 + dragProgress * 0.07})`;
            } else {
              transform = 'translate3d(0, 14px, 0) scale(0.96)';
              opacity = 0.85;
              filter = 'brightness(0.93)';
            }
          } else if (rel === 2) {
            // Card 2 further behind (steps up when swiping left)
            zIndex = 10;
            if (isSwipeLeft) {
              const y = 26 - dragProgress * 12;
              const s = 0.92 + dragProgress * 0.04;
              transform = `translate3d(0, ${y}px, 0) scale(${s})`;
              opacity = 0.60 + dragProgress * 0.25;
              filter = `brightness(${0.86 + dragProgress * 0.07})`;
            } else {
              transform = 'translate3d(0, 26px, 0) scale(0.92)';
              opacity = 0.60;
              filter = 'brightness(0.86)';
            }
          } else if (rel === total - 1) {
            // Previous card: sits ready to the left
            zIndex = isSwipeRight ? 35 : 5;
            if (isSwipeRight) {
              const xPercent = -105 + (dragX / 300) * 105;
              transform = `translate3d(${xPercent}%, 0, 0) rotateZ(-4deg) scale(0.98)`;
              opacity = Math.min(1, dragProgress * 1.2);
            } else {
              transform = 'translate3d(-110%, 0, 0) rotateZ(-6deg) scale(0.95)';
              opacity = 0;
            }
          }

          return (
            <div
              key={group.id}
              onClick={() => handleCardClick(group, rel)}
              className={`absolute inset-x-0 top-0 h-[196px] ${
                rel === 0
                  ? 'cursor-grab active:cursor-grabbing pointer-events-auto'
                  : 'cursor-pointer pointer-events-auto'
              }`}
              style={{
                transform,
                transformOrigin: 'bottom center',
                opacity,
                zIndex,
                filter,
                transition: isDragging
                  ? 'none'
                  : 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1), opacity 260ms ease, filter 260ms ease',
              }}
            >
              <DeckCardItem group={group} uid={uid} isFront={rel === 0} />
            </div>
          );
        })}
      </div>
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
