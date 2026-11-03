import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** iOS "inset grouped" list: white rounded block with thin lines between rows. */
export function GroupList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[20px] bg-white ${className}`}>
      <div className="divide-y divide-hairline">{children}</div>
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 flex items-end gap-2 px-1">
      <h2 className="min-w-0 flex-1 truncate text-[20px] font-bold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

interface RowProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  label: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'danger' | 'accent' | 'ok';
  chevron?: boolean;
}

const tones = {
  default: 'text-ink',
  danger: 'text-bad',
  accent: 'text-accent',
  ok: 'text-ok-ink',
};

export function GroupRow({ icon, label, detail, tone = 'default', chevron = true, className = '', ...rest }: RowProps) {
  return (
    <button
      type="button"
      className={`flex min-h-[52px] w-full min-w-0 items-center gap-3 px-4 py-2.5 text-left transition active:bg-fill disabled:opacity-50 ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className={`min-w-0 flex-1 truncate text-[15px] font-medium ${tones[tone]}`}>{label}</span>
      {detail && <span className="shrink-0 text-[14px] text-muted">{detail}</span>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-muted/60" strokeWidth={2.5} />}
    </button>
  );
}

export function RowIcon({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span className="grid size-[30px] place-items-center rounded-[9px] text-white" style={{ background: color }}>
      {children}
    </span>
  );
}
