import { Check } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

export interface PickPerson {
  uid: string;
  name: string;
  photo: string;
  isMe: boolean;
  isPending?: boolean;
}

interface Props {
  people: PickPerson[];
  selected: Set<string>;
  onToggle: (uid: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  error?: string;
}

export function PeoplePicker({ people, selected, onToggle, onSelectAll, onClear, error }: Props) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-3 px-1">
        <span className="flex-1 text-[13px] font-medium text-muted">Who will split this?</span>
        <button type="button" onClick={onSelectAll} className="text-[13px] font-semibold text-accent">
          Pick all
        </button>
        <button type="button" onClick={onClear} className="text-[13px] font-semibold text-muted">
          Clear
        </button>
      </div>
      <div className={`overflow-hidden rounded-2xl bg-white ring-inset ${error ? 'ring-1 ring-bad' : ''}`}>
        <div className="divide-y divide-hairline">
          {people.map((p) => {
            const on = selected.has(p.uid);
            return (
              <button
                key={p.uid}
                type="button"
                onClick={() => onToggle(p.uid)}
                aria-pressed={on}
                className="flex w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition active:bg-fill"
              >
                <Avatar name={p.name} photo={p.photo} size="sm" />
                <div className="min-w-0 flex-1 flex items-center gap-1.5 truncate">
                  <span className="truncate text-[15px] font-medium text-ink">{p.isMe ? 'Me' : p.name}</span>
                  {p.isPending && (
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                      Pending
                    </span>
                  )}
                </div>
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full transition ${
                    on ? 'bg-accent text-white' : 'ring-[1.5px] ring-fill-strong ring-inset'
                  }`}
                >
                  {on && <Check className="size-3.5" strokeWidth={3.5} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {error ? (
        <p className="mt-1.5 px-1 text-[13px] font-medium text-bad">{error}</p>
      ) : (
        <p className="mt-1.5 px-1 text-[12px] leading-relaxed text-muted">
          Pick "Me" too if you also used this item. Your share is counted as paid.
        </p>
      )}
    </div>
  );
}
