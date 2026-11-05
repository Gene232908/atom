import { ArrowDownLeft, ArrowUpRight, Check, Layers, Smartphone, Sparkles, WalletCards } from 'lucide-react';
import { Sheet } from '../ui/Sheet';

export type DefaultViewPref = 'auto' | 'lend' | 'owe' | 'loans';
export type CardLayoutMode = 'stack' | 'single';

interface Props {
  open: boolean;
  onClose: () => void;
  preference: DefaultViewPref;
  onSelect: (pref: DefaultViewPref) => void;
  layoutMode: CardLayoutMode;
  onSelectLayoutMode: (mode: CardLayoutMode) => void;
}

export function DefaultViewSheet({
  open,
  onClose,
  preference,
  onSelect,
  layoutMode,
  onSelectLayoutMode,
}: Props) {
  const tabOptions: {
    id: DefaultViewPref;
    title: string;
    description: string;
    icon: typeof ArrowUpRight;
    tone: 'lend' | 'owe' | 'loans' | 'auto';
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
      id: 'loans',
      title: 'My Loans',
      description: 'Always show your personal installment loans first.',
      icon: WalletCards,
      tone: 'loans',
    },
    {
      id: 'auto',
      title: 'Auto (Recommended)',
      description: 'Opens "You lend" if you have lists, otherwise opens "You owe".',
      icon: Sparkles,
      tone: 'auto',
    },
  ];

  const layoutOptions: {
    id: CardLayoutMode;
    title: string;
    description: string;
    icon: typeof Layers;
  }[] = [
    {
      id: 'stack',
      title: 'All cards (Stacked)',
      description: 'Displays all cards stacked vertically like Apple Wallet.',
      icon: Layers,
    },
    {
      id: 'single',
      title: 'Individual (1 card at a time)',
      description: 'Shows 1 card on screen. Swipe left or right to switch cards.',
      icon: Smartphone,
    },
  ];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Wallet settings"
      description="Customize which view and card layout appears on your home screen."
    >
      <div className="space-y-6 pt-2">
        {/* Section 1: Default Tab */}
        <div>
          <p className="px-1 text-[13px] font-semibold text-ink uppercase tracking-wider mb-2.5">
            Default view on open
          </p>
          <div className="space-y-2.5">
            {tabOptions.map((opt) => {
              const selected = preference === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelect(opt.id)}
                  className={`flex w-full items-center gap-3.5 rounded-[18px] p-3.5 text-left transition active:scale-[0.99] ${
                    selected
                      ? 'bg-white ring-2 ring-accent shadow-sm'
                      : 'bg-white/80 ring-1 ring-hairline hover:bg-white'
                  }`}
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full ${
                      opt.tone === 'lend'
                        ? 'bg-ok/12 text-ok-ink'
                        : opt.tone === 'owe'
                          ? 'bg-bad/10 text-bad-ink'
                          : opt.tone === 'loans'
                            ? 'bg-accent/15 text-accent'
                            : 'bg-indigo-50 text-indigo-600'
                    }`}
                  >
                    <Icon className="size-4.5" strokeWidth={2.4} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{opt.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted">{opt.description}</p>
                  </div>

                  {selected && (
                    <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Card Display Mode ("Change the UI") */}
        <div>
          <p className="px-1 text-[13px] font-semibold text-ink uppercase tracking-wider mb-2.5">
            Card display style
          </p>
          <div className="space-y-2.5">
            {layoutOptions.map((opt) => {
              const selected = layoutMode === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectLayoutMode(opt.id)}
                  className={`flex w-full items-center gap-3.5 rounded-[18px] p-3.5 text-left transition active:scale-[0.99] ${
                    selected
                      ? 'bg-white ring-2 ring-accent shadow-sm'
                      : 'bg-white/80 ring-1 ring-hairline hover:bg-white'
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink/5 text-ink">
                    <Icon className="size-4.5" strokeWidth={2.2} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">{opt.title}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted">{opt.description}</p>
                  </div>

                  {selected && (
                    <span className="grid size-5.5 shrink-0 place-items-center rounded-full bg-accent text-white shadow-sm">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
