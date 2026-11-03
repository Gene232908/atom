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
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [animating, setAnimating] = useState<'left' | 'right' | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isSwipingRef = useRef<boolean | null>(null);
  const currentDragXRef = useRef(0);
  const didMoveRef = useRef(false);

  const total = groups.length;
  if (total === 0) return null;

  const current = ((index % total) + total) % total;

  // Next card (card 1 behind)
  // When dragging right or animating right, show previous card underneath
  const isSwipingRight = (isDragging && dragX > 0) || animating === 'right';
  const midIndex = isSwipingRight
    ? (current - 1 + total) % total
    : (current + 1) % total;

  // Back card (card 2 further behind)
  const backIndex = isSwipingRight
    ? (current - 2 + total) % total
    : (current + 2) % total;

  const frontGroup = groups[current];
  const midGroup = total > 1 ? groups[midIndex] : null;
  const backGroup = total > 2 ? groups[backIndex] : null;

  const triggerSwipe = (direction: 'left' | 'right') => {
    setAnimating(direction);
    setDragX(direction === 'left' ? -380 : 380);

    setTimeout(() => {
      setIndex((i) => (direction === 'left' ? (i + 1) % total : (i - 1 + total) % total));
      setAnimating(null);
      setDragX(0);
      currentDragXRef.current = 0;
      didMoveRef.current = false;
    }, 320);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (animating || total <= 1) return;
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
    if (!isDragging || animating || total <= 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startXRef.current;
    const dy = touch.clientY - startYRef.current;

    if (isSwipingRef.current === null) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < 8 && absY < 8) return;

      if (absY > absX) {
        // Vertical scroll detected: release horizontal capture so page scrolls smoothly
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
        triggerSwipe(dx < 0 ? 'left' : 'right');
      } else {
        setDragX(0);
      }
    } else {
      setDragX(0);
    }
    isSwipingRef.current = null;
    setTimeout(() => {
      didMoveRef.current = false;
    }, 50);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (animating || total <= 1) return;
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
        triggerSwipe(dx < 0 ? 'left' : 'right');
      } else {
        setDragX(0);
      }
      setTimeout(() => {
        didMoveRef.current = false;
      }, 50);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleFrontClick = (e: React.MouseEvent) => {
    if (didMoveRef.current || Math.abs(currentDragXRef.current) > 8) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    navigate(`/g/${frontGroup.id}`);
  };

  // Interpolations
  const dragProgress = Math.min(1, Math.abs(dragX) / 140);
  const rotateZ = dragX * 0.05;
  const rotateY = dragX * -0.06;

  // Front card transform & transition
  const frontTransform = isDragging
    ? `translate3d(${dragX}px, 0, 0) rotateZ(${rotateZ}deg) rotateY(${rotateY}deg) scale(1.02)`
    : animating === 'left'
      ? 'translate3d(-130%, 15px, 0) rotateZ(-22deg) rotateY(35deg) scale(0.85)'
      : animating === 'right'
        ? 'translate3d(130%, 15px, 0) rotateZ(22deg) rotateY(-35deg) scale(0.85)'
        : 'translate3d(0, 0, 0) rotateZ(0deg) rotateY(0deg) scale(1)';

  const frontOpacity = animating ? 0 : 1;
  const frontTransition = isDragging
    ? 'none'
    : 'transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 260ms ease';

  // Middle card (Card 1 behind)
  const midY = -14 + dragProgress * 14;
  const midScale = 0.95 + dragProgress * 0.05;
  const midOpacity = 0.85 + dragProgress * 0.15;
  const midBrightness = 0.92 + dragProgress * 0.08;

  const midTransform = isDragging
    ? `translate3d(0, ${midY}px, 0) scale(${midScale})`
    : animating
      ? 'translate3d(0, 0, 0) scale(1)'
      : 'translate3d(0, -14px, 0) scale(0.95)';

  // Back card (Card 2 further behind)
  const backY = -26 + dragProgress * 12;
  const backScale = 0.90 + dragProgress * 0.05;
  const backOpacity = 0.65 + dragProgress * 0.20;
  const backBrightness = 0.85 + dragProgress * 0.07;

  const backTransform = isDragging
    ? `translate3d(0, ${backY}px, 0) scale(${backScale})`
    : animating
      ? 'translate3d(0, -14px, 0) scale(0.95)'
      : 'translate3d(0, -26px, 0) scale(0.90)';

  return (
    <div
      className="relative w-full pt-8 pb-3 select-none touch-pan-y"
      style={{ perspective: '1200px' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onPointerDown={onPointerDown}
    >
      <div className="relative mx-auto w-full max-w-[420px] h-[196px]" style={{ transformStyle: 'preserve-3d' }}>
        {/* Layer 2: Back Card (peeking furthest behind) */}
        {backGroup && (
          <div
            onClick={() => !animating && triggerSwipe('left')}
            className="absolute inset-0 cursor-pointer pointer-events-auto"
            style={{
              transform: backTransform,
              transformOrigin: 'top center',
              opacity: animating ? 0.85 : backOpacity,
              filter: animating ? 'brightness(0.92)' : `brightness(${backBrightness})`,
              transition: isDragging
                ? 'none'
                : 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 320ms ease, filter 320ms ease',
              zIndex: 10,
            }}
          >
            <DeckCardItem group={backGroup} uid={uid} isFront={false} />
          </div>
        )}

        {/* Layer 1: Middle Card (peeking directly behind front card) */}
        {midGroup && (
          <div
            onClick={() => !animating && triggerSwipe('left')}
            className="absolute inset-0 cursor-pointer pointer-events-auto"
            style={{
              transform: midTransform,
              transformOrigin: 'top center',
              opacity: animating ? 1 : midOpacity,
              filter: animating ? 'brightness(1)' : `brightness(${midBrightness})`,
              transition: isDragging
                ? 'none'
                : 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 320ms ease, filter 320ms ease',
              zIndex: 20,
            }}
          >
            <DeckCardItem group={midGroup} uid={uid} isFront={false} />
          </div>
        )}

        {/* Layer 0: Front Active Card */}
        <div
          onClick={handleFrontClick}
          className="absolute inset-0 cursor-grab active:cursor-grabbing pointer-events-auto"
          style={{
            transform: frontTransform,
            transformOrigin: 'top center',
            opacity: frontOpacity,
            transition: frontTransition,
            zIndex: 30,
          }}
        >
          <DeckCardItem group={frontGroup} uid={uid} isFront={true} />
        </div>
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
