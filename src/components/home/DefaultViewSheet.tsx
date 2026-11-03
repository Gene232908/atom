import { ArrowDownLeft, ArrowUpRight, Check, Sparkles } from 'lucide-react';
import { Sheet } from '../ui/Sheet';

export type DefaultViewPref = 'auto' | 'lend' | 'owe';

interface Props {
  open: boolean;
  onClose: () => void;
  preference: DefaultViewPref;
  onSelect: (pref: DefaultViewPref) => void;
}

export function DefaultViewSheet({ open, onClose, preference, onSelect }: Props) {
  const options: {
    id: DefaultViewPref;
    title: string;
    description: string;
    icon: typeof ArrowUpRight;
    tone: 'lend' | 'owe' | 'auto';
  }[] = [
    {
      id: 'lend',
      title: 'You lend',
      description: 'Always show lists where people owe you money first.',
      icon: ArrowUpRight,
      tone: 'lend',
    },
    {
      id: 'owe',
      title: 'You owe',
      description: 'Always show lists where you borrowed money first.',
      icon: ArrowDownLeft,
      tone: 'owe',
    },
    {
      id: 'auto',
      title: 'Auto (Recommended)',
      description: 'Opens "You lend" if you have lists, otherwise opens "You owe".',
      icon: Sparkles,
      tone: 'auto',
    },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Default view"
      description="Which would you like to see first every time you open this app?"
    >
      <div className="space-y-3 pt-2">
        {options.map((opt) => {
          const selected = preference === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelect(opt.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3.5 rounded-[20px] p-4 text-left transition active:scale-[0.99] ${
                selected
                  ? 'bg-white ring-2 ring-accent shadow-sm'
                  : 'bg-white/80 ring-1 ring-hairline hover:bg-white'
              }`}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-full ${
                  opt.tone === 'lend'
                    ? 'bg-ok/12 text-ok-ink'
                    : opt.tone === 'owe'
                      ? 'bg-bad/10 text-bad-ink'
                      : 'bg-accent/12 text-accent'
                }`}
              >
                <Icon className="size-5" strokeWidth={2.4} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-semibold text-ink">{opt.title}</p>
                </div>
                <p className="mt-0.5 text-[13px] leading-snug text-muted">{opt.description}</p>
              </div>

              {selected && (
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
