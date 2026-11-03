import type { ReactNode } from 'react';

export interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  highlight?: boolean;
}

/** Round shortcut buttons under the card, like in banking apps. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl py-1 transition active:scale-95"
        >
          <span
            className={`relative grid size-14 place-items-center rounded-full transition ${
              a.highlight ? 'bg-ink text-white' : 'bg-white text-ink group-hover:bg-white/70'
            }`}
          >
            {a.icon}
            {a.highlight && <span className="absolute top-0.5 right-0.5 size-3 rounded-full bg-warn ring-2 ring-canvas" />}
          </span>
          <span className="max-w-full truncate text-[12px] font-medium">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
