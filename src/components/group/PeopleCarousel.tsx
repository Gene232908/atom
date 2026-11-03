import { Crown, Plus } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { firstName } from '../../lib/items';
import type { PersonSummary } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { Carousel } from './Carousel';

interface Props {
  people: PersonSummary[];
  uid: string;
  isOwner: boolean;
  onOpen: (uid: string) => void;
  onInvite: () => void;
}

/** Swipeable people cards with how much each one still owes. */
export function PeopleCarousel({ people, uid, isOwner, onOpen, onInvite }: Props) {
  const cards = people.map((p) => {
    const total = p.owes + p.paid;
    const pct = total > 0 ? Math.round((p.paid / total) * 100) : 100;
    return (
      <button
        key={p.uid}
        type="button"
        onClick={() => onOpen(p.uid)}
        className="flex h-full w-full flex-col rounded-[20px] bg-white p-3.5 text-left transition active:scale-[0.97]"
      >
        <div className="flex items-start justify-between gap-2">
          <Avatar name={p.name} photo={p.photo} />
          {p.isOwner && <Crown className="size-4 text-warn" aria-label="Lender" />}
        </div>
        <p className="mt-2.5 truncate text-[14px] font-semibold">
          {p.uid === uid ? 'You' : firstName(p.name)}
        </p>
        {p.isOwner ? (
          <p className="truncate text-[12px] font-medium text-muted">Lender</p>
        ) : p.owes > 0 ? (
          <p className="truncate text-[13px] font-semibold text-bad-ink tabular-nums">{formatMoney(p.owes)}</p>
        ) : (
          <p className="truncate text-[12px] font-semibold text-ok-ink">All paid</p>
        )}
        {!p.isOwner && (
          <div className="mt-auto pt-2.5">
            <div className="h-1 overflow-hidden rounded-full bg-fill">
              <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </button>
    );
  });

  if (isOwner) {
    cards.push(
      <button
        key="invite"
        type="button"
        onClick={onInvite}
        className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[20px] border-2 border-dashed border-fill-strong p-3.5 text-muted transition active:scale-[0.97]"
      >
        <span className="grid size-10 place-items-center rounded-full bg-white text-ink">
          <Plus className="size-5" />
        </span>
        <span className="text-[13px] font-semibold">Invite</span>
      </button>,
    );
  }

  return (
    <Carousel slideClass="w-[136px] lg:w-auto" wideClass="lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
      {cards}
    </Carousel>
  );
}
