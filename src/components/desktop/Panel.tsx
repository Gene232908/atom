import type { ReactNode } from 'react';
import type { Tone } from '../../lib/itemStatus';

/** White dashboard panel with an optional header. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-hairline ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="truncate text-[12px] text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

const TINTS: Record<Tone, string> = {
  bad: 'bg-bad/10 text-bad-ink',
  warn: 'bg-warn/15 text-warn-ink',
  ok: 'bg-ok/12 text-ok-ink',
  accent: 'bg-accent/10 text-accent',
  muted: 'bg-fill text-muted',
};

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone: Tone;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${TINTS[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 truncate text-[26px] leading-tight font-bold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="mt-1 truncate text-[12px] text-muted">{hint}</p>}
    </>
  );
  const cls =
    'min-w-0 rounded-2xl bg-white p-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-hairline';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition hover:ring-ink/15 active:scale-[0.99]`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ${TINTS[tone]}`}>
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Pill-shaped tab switcher. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string; count?: number }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-fill p-1" role="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition ${
              on ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className={`text-[11px] tabular-nums ${on ? 'text-muted' : 'text-muted/70'}`}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
