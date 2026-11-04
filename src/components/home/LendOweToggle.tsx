type Tab = 'lend' | 'owe';

/** Phone home screen switch between "You lend" and "You owe". */
export function LendOweToggle({
  tab,
  onChange,
  lendCount,
  oweCount,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  lendCount: number;
  oweCount: number;
}) {
  const options: { key: Tab; label: string; count: number }[] = [
    { key: 'lend', label: 'You lend', count: lendCount },
    { key: 'owe', label: 'You owe', count: oweCount },
  ];
  return (
    <div className="inline-flex items-center rounded-full bg-[#e5e5ea] p-1 ring-1 ring-black/[0.04]">
      {options.map((o) => {
        const on = tab === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
              on ? 'bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.08)]' : 'text-muted hover:text-ink'
            }`}
          >
            <span>{o.label}</span>
            {o.count > 0 && (
              <span
                className={`grid min-w-[18px] h-[18px] place-items-center rounded-full px-1 text-[11px] font-bold ${
                  on ? 'bg-ink text-white' : 'bg-black/10 text-muted'
                }`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
