import { X } from 'lucide-react';
import type { ItemFilter } from '../../lib/items';

interface Props {
  filter: ItemFilter;
  counts: Record<ItemFilter, number>;
  showWaiting: boolean;
  onChange: (filter: ItemFilter) => void;
  /** null = everyone, '' = you, otherwise the person's name */
  personName: string | null;
  onClearPerson: () => void;
}

const LABELS: Record<ItemFilter, string> = {
  all: 'All',
  unpaid: 'Unpaid',
  waiting: 'Confirm',
  paid: 'Paid',
};

/** iOS segmented control */
export function FilterBar({ filter, counts, showWaiting, onChange, personName, onClearPerson }: Props) {
  const options: ItemFilter[] = showWaiting ? ['all', 'unpaid', 'waiting', 'paid'] : ['all', 'unpaid', 'paid'];

  return (
    <div className="space-y-2.5 select-none">
      {personName !== null && (
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-ink py-1 pr-1 pl-4 text-[13px] text-white">
          <span className="min-w-0 flex-1 truncate">
            {personName === '' ? 'Showing your items' : `Showing ${personName}'s items`}
          </span>
          <button
            type="button"
            onClick={onClearPerson}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 text-[12px] font-semibold active:scale-95"
          >
            <X className="size-3.5" />
            Show all
          </button>
        </div>
      )}
      <div className="flex rounded-[11px] bg-fill p-0.5" role="tablist" aria-label="Filter items">
        {options.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(key)}
              className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-[9px] px-1 text-[13px] font-semibold transition ${
                active ? 'bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.1)]' : 'text-ink/70 hover:text-ink'
              }`}
            >
              <span className="truncate">{LABELS[key]}</span>
              <span
                className={`text-[11px] tabular-nums ${
                  key === 'waiting' && counts.waiting > 0 ? 'font-bold text-warn-ink' : 'text-muted'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
