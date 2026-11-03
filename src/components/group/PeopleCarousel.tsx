import { Crown, Plus } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { firstName } from '../../lib/items';
import type { PersonSummary } from '../../lib/types';
import { Avatar } from '../ui/Avatar';

interface Props {
  people: PersonSummary[];
  uid: string;
  isOwner: boolean;
  onOpen: (uid: string) => void;
  onInvite: () => void;
}

/**
 * Minimalist horizontal member chips instead of bulky oversized cards.
 * Easy to scan, clean, and avoids card fatigue.
 */
export function PeopleCarousel({ people, uid, isOwner, onOpen, onInvite }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
      {people.map((p) => {
        const isSelf = p.uid === uid;
        const name = isSelf ? 'You' : firstName(p.name);

        return (
          <button
            key={p.uid}
            type="button"
            onClick={() => onOpen(p.uid)}
            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-2.5 py-1.5 text-left shadow-sm ring-1 ring-hairline transition hover:ring-black/15 active:scale-95 select-none"
          >
            <div className="size-6 shrink-0 rounded-full overflow-hidden">
              <Avatar name={p.name} photo={p.photo} size="sm" />
            </div>

            <span className="truncate max-w-[80px] sm:max-w-[100px] text-[13px] font-semibold text-ink">
              {name}
            </span>

            {p.isOwner ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-warn-ink">
                <Crown className="size-3 text-warn" />
                Lender
              </span>
            ) : p.owes > 0 ? (
              <span className="shrink-0 rounded-full bg-bad/10 px-2 py-0.5 text-[11px] font-bold text-bad-ink tabular-nums">
                {formatMoney(p.owes)}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-ok/10 px-2 py-0.5 text-[11px] font-bold text-ok-ink">
                Paid
              </span>
            )}
          </button>
        );
      })}

      {isOwner && (
        <button
          type="button"
          onClick={onInvite}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-muted/50 bg-white/60 px-3 py-1.5 text-[12px] font-semibold text-muted transition hover:border-accent hover:text-accent hover:bg-white active:scale-95 select-none"
        >
          <Plus className="size-3.5" strokeWidth={2.5} />
          <span>Invite</span>
        </button>
      )}
    </div>
  );
}
