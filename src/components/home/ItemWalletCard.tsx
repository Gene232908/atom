import { useState, useRef } from 'react';
import { CalendarClock, ShoppingBag } from 'lucide-react';
import { storeGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { dueInfo, isItemDone, itemProgress } from '../../lib/items';
import type { CardLayoutMode } from './DefaultViewSheet';
import type { GroupItem } from '../../hooks/useAllItems';
import { WalletCard } from '../ui/WalletCard';
import { AvatarStack } from '../ui/AvatarStack';

interface CardProps {
  item: GroupItem;
  uid: string;
  index?: number;
  onOpen: (item: GroupItem) => void;
  interactive?: boolean;
}

/** An item shown as an Apple Wallet Card directly on the homepage */
export function ItemWalletCard({ item, uid, index = 0, onOpen, interactive = true }: CardProps) {
  const isOwner = item.group.ownerId === uid;
  const store = (item.store || '').trim() || 'Credit Card';
  const last4 = item.id.slice(-4).toUpperCase();
  const done = isItemDone(item, item.group.ownerId);
  const due = dueInfo(item.dueDate, done);
  const { paid, total } = itemProgress(item, item.group.ownerId);

  const mine = item.shares ? item.shares[uid] : undefined;
  const myPaid = mine?.paidCents ?? (mine?.status === 'paid' ? item.splitCents : 0);
  const myRemaining = Math.max(0, item.splitCents - myPaid);
  const isMyShareDone = mine?.status === 'paid' || (mine?.paidCents ? mine.paidCents >= item.splitCents : false);
  const isWaiting = mine?.status === 'claimed';

  const installmentMonthly =
    item.installmentsCount && item.installmentsCount > 1 && item.splitCents > 0
      ? Math.round(item.splitCents / item.installmentsCount)
      : null;

  const people = item.group.memberIds
    .filter((id) => id !== item.group.ownerId && item.shares[id])
    .map((id) => item.group.members[id])
    .filter(Boolean);

  const progressPercent = isOwner
    ? total > 0 ? Math.round((paid / total) * 100) : 0
    : item.splitCents > 0 ? Math.min(100, Math.round((myPaid / item.splitCents) * 100)) : 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="block w-full animate-rise text-left transition-transform duration-300 select-none hover:-translate-y-1.5 active:scale-[0.98] focus:outline-none"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <WalletCard
        seed={item.id}
        background={storeGradient(store, item.id, item.color)}
        interactive={interactive}
        className="flex min-h-[210px] sm:min-h-[224px] flex-col p-5"
      >
        {/* Top Header: Store Name on Left, Due Date & Cycle Pills on Right */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
              <ShoppingBag className="size-3.5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold tracking-[0.08em] text-white uppercase drop-shadow-sm">
                {store}
              </p>
              {item.installmentsCount && item.installmentsCount > 1 && (
                <p className="text-[11px] font-medium text-white/80">
                  {item.installmentsCount} mos installment
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
            {due && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  due.tone === 'slate' ? 'bg-white/15 text-white' : 'bg-white text-bad-ink shadow-sm'
                }`}
              >
                <CalendarClock className="size-3" />
                {due.text}
              </span>
            )}
            {item.billingCycle && (
              <span className="inline-flex items-center rounded-full bg-black/25 px-2.5 py-0.5 text-[10px] font-medium text-white/95 backdrop-blur">
                {item.billingCycle}
              </span>
            )}
          </div>
        </div>

        {/* Item Title */}
        <p className="mt-3 truncate text-[16px] font-bold text-white drop-shadow-sm">
          {item.description}
        </p>

        {/* Amounts & Monthly Breakdown */}
        <div className="mt-auto pt-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-wider text-white/70 uppercase">
                {isOwner ? 'Total Charge' : myPaid > 0 && !isMyShareDone ? 'Remaining' : 'Your Share'}
              </p>
              <p className="truncate text-[26px] leading-tight font-bold tracking-tight text-white drop-shadow tabular-nums sm:text-[30px]">
                {formatMoney(isOwner ? item.priceCents : myPaid > 0 && !isMyShareDone ? myRemaining : item.splitCents)}
              </p>
            </div>

            {(item.monthlyCents || installmentMonthly) && (
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold tracking-wider text-white/70 uppercase">Cut-off</p>
                <p className="text-[15px] font-bold text-white tabular-nums">
                  {formatMoney(item.monthlyCents || installmentMonthly!)}
                  <span className="text-[11px] font-normal text-white/80">/mo</span>
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar & Subtext */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-white/80">
              <span>
                {isOwner
                  ? total === 0
                    ? 'Waiting for members'
                    : done
                      ? 'All paid in full'
                      : `${paid} of ${total} paid in full`
                  : isMyShareDone
                    ? 'Paid in full ✓'
                    : isWaiting
                      ? 'Waiting verification...'
                      : myPaid > 0
                        ? `Paid ${formatMoney(myPaid)} of ${formatMoney(item.splitCents)}`
                        : 'Not paid'}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Bottom Card Footer: Last 4 digits + Member Avatars */}
          <div className="mt-2.5 flex items-center justify-between text-white/70">
            <span className="font-mono text-[12px] tracking-[0.16em]">•••• {last4}</span>
            {people.length > 0 && <AvatarStack people={people} />}
          </div>
        </div>
      </WalletCard>
    </button>
  );
}

/** Stacked layout (Apple Wallet on phones, responsive grid on desktop) */
export function ItemWalletStack({
  items,
  uid,
  onOpen,
}: {
  items: GroupItem[];
  uid: string;
  onOpen: (item: GroupItem) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item, i) => (
        <div key={item.id} className={`relative min-w-0 ${i > 0 ? 'max-sm:-mt-[140px]' : ''}`} style={{ zIndex: i }}>
          <ItemWalletCard item={item} uid={uid} index={i} onOpen={onOpen} />
        </div>
      ))}
    </div>
  );
}

/** 3D Single Card Swipe Mode */
export function SingleItemCarousel({
  items,
  uid,
  onOpen,
}: {
  items: GroupItem[];
  uid: string;
  onOpen: (item: GroupItem) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isSwipingRef = useRef<boolean | null>(null);
  const currentDragXRef = useRef(0);
  const didMoveRef = useRef(false);

  const total = items.length;
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
    isSwipingRef.current = null;
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full max-w-[420px] select-none touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="relative h-[240px] sm:h-[250px] w-full">
          {items.map((item, idx) => {
            const rel = ((idx - activeIndex + total) % total);
            if (rel > 2 && rel < total - 1) return null;

            const isFront = rel === 0;
            const isNext = rel === 1;
            const isPrev = rel === total - 1;

            let x = 0;
            let y = 0;
            let scale = 1;
            let opacity = 1;
            let z = 10;

            if (isFront) {
              x = dragX;
              y = 0;
              scale = 1;
              z = 30;
            } else if (isNext) {
              x = 0;
              y = 14;
              scale = 0.94;
              opacity = 0.85;
              z = 20;
            } else if (isPrev) {
              x = 0;
              y = 26;
              scale = 0.88;
              opacity = 0.55;
              z = 10;
            } else {
              x = 0;
              y = 26;
              scale = 0.88;
              opacity = 0;
              z = 5;
            }

            return (
              <div
                key={item.id}
                className="absolute inset-0 transition-transform duration-300"
                style={{
                  transform: `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
                  opacity,
                  zIndex: z,
                  pointerEvents: isFront ? 'auto' : 'none',
                }}
              >
                <ItemWalletCard
                  item={item}
                  uid={uid}
                  onOpen={onOpen}
                  interactive={isFront}
                />
              </div>
            );
          })}
        </div>
      </div>

      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to card ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? 'w-6 bg-ink' : 'w-1.5 bg-black/20 hover:bg-black/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Controls display mode for Item Cards */
export function ItemCardsView({
  items,
  uid,
  mode,
  onOpen,
}: {
  items: GroupItem[];
  uid: string;
  mode: CardLayoutMode;
  onOpen: (item: GroupItem) => void;
}) {
  if (items.length === 0) return null;
  if (mode === 'single') {
    return <SingleItemCarousel items={items} uid={uid} onOpen={onOpen} />;
  }
  return <ItemWalletStack items={items} uid={uid} onOpen={onOpen} />;
}
