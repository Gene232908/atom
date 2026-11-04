import type { ReactNode } from 'react';
import type { Tone } from '../../lib/itemStatus';

/** White dashboard panel with an optional header. */
export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = '',
  delay = 0,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`min-w-0 animate-rise overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-black/[0.06] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || actions) && (
        <header className="flex items-center gap-4 px-6 pt-5 pb-4">
          <div className="min-w-0 flex-1">
            {title && <h2 className="truncate text-[15px] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 truncate text-[12px] text-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

const TONE_TEXT: Record<Tone, string> = {
  bad: 'text-bad-ink',
  warn: 'text-warn-ink',
  ok: 'text-ok-ink',
  accent: 'text-accent',
  muted: 'text-muted',
};

export interface StatItem {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  onClick?: () => void;
}

/** One clean summary bar with thin dividers instead of separate boxes. */
export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <section className="grid animate-rise grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-black/[0.06] xl:grid-cols-4">
      {items.map((s, i) => {
        const borders = [
          i % 2 === 1 ? 'border-l' : '',
          i >= 2 ? 'border-t xl:border-t-0' : '',
          i === 2 ? 'xl:border-l' : '',
        ].join(' ');
        const body = (
          <>
            <p className="truncate text-[13px] font-medium text-muted">{s.label}</p>
            <p className="mt-2 truncate text-[26px] leading-none font-semibold tracking-tight text-ink tabular-nums">
              {s.value}
            </p>
            {s.hint && (
              <p className={`mt-2 truncate text-[12px] font-medium ${TONE_TEXT[s.tone ?? 'muted']}`}>{s.hint}</p>
            )}
          </>
        );
        const cls = `min-w-0 border-hairline px-6 py-5 text-left ${borders}`;
        return s.onClick ? (
          <button key={s.label} type="button" onClick={s.onClick} className={`${cls} transition hover:bg-canvas/60`}>
            {body}
          </button>
        ) : (
          <div key={s.label} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}

const PILL: Record<Tone, string> = {
  bad: 'bg-bad/8 text-bad-ink',
  warn: 'bg-warn/12 text-warn-ink',
  ok: 'bg-ok/10 text-ok-ink',
  accent: 'bg-accent/8 text-accent',
  muted: 'bg-fill text-muted',
};

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${PILL[tone]}`}>
      <span className="truncate">{label}</span>
    </span>
  );
}

/** Text tabs with an underline, e.g. "You lend · You owe". */
export function UnderlineTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string; count?: number }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex items-center gap-6" role="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={`relative pb-3 text-[14px] font-medium transition ${on ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 text-[12px] text-muted tabular-nums">{o.count}</span>}
            <span
              className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full transition ${on ? 'bg-accent' : 'bg-transparent'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

/** Small text filter buttons, e.g. "All · Unpaid · Paid". */
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
    <div className="inline-flex items-center gap-1" role="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.key)}
            className={`h-8 rounded-lg px-3 text-[13px] font-medium transition ${
              on ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-fill hover:text-ink'
            }`}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1 text-[11px] opacity-70 tabular-nums">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
