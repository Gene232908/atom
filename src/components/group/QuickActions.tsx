import type { ReactNode } from 'react';

export interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  highlight?: boolean;
}

// Liquid glass: clear body with a soft tint, a light-catching rim (liquid-rim) and no drop shadow.
const GLASS =
  'liquid-rim bg-white/40 backdrop-blur-xl backdrop-saturate-150 text-ink ' +
  'shadow-[inset_0_-1px_3px_rgba(0,0,0,0.03),0_0_0_0.5px_rgba(0,0,0,0.07)]';

const GLASS_ACCENT =
  'liquid-rim bg-accent/[0.08] backdrop-blur-xl backdrop-saturate-150 text-accent ' +
  'shadow-[inset_0_-1px_3px_rgba(0,122,255,0.06),0_0_0_0.5px_rgba(0,122,255,0.25)]';

/** Round glass shortcut buttons under the card, like iPhone controls. */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl py-1 outline-none"
        >
          <span className="relative transition duration-200 ease-out group-hover:-translate-y-0.5 group-active:scale-90">
            <span
              className={`relative grid size-14 place-items-center overflow-hidden rounded-full group-focus-visible:ring-2 group-focus-visible:ring-accent ${
                a.highlight ? GLASS_ACCENT : GLASS
              }`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-2 top-px h-[45%] rounded-full bg-linear-to-b from-white/60 to-white/0"
              />
              <span className="relative">{a.icon}</span>
            </span>
            {a.highlight && <span className="absolute top-0.5 right-0.5 size-3 rounded-full bg-warn ring-2 ring-canvas" />}
          </span>
          <span className="max-w-full truncate text-[12px] font-medium text-ink/80">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
