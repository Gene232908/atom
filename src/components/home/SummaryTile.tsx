import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatMoney } from '../../lib/money';

export function SummaryTile({
  label,
  amount,
  tone,
  sublabel,
}: {
  label: string;
  amount: number;
  tone: 'ok' | 'bad';
  sublabel?: string;
}) {
  const Icon = tone === 'ok' ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="min-w-0 rounded-[18px] sm:rounded-[20px] bg-white p-3 sm:p-4 shadow-sm ring-1 ring-hairline/80">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span
            className={`grid size-6 sm:size-7 shrink-0 place-items-center rounded-full ${
              tone === 'ok' ? 'bg-ok/12 text-ok-ink' : 'bg-bad/10 text-bad-ink'
            }`}
          >
            <Icon className="size-3.5 sm:size-4" strokeWidth={2.5} />
          </span>
          <p className="truncate text-[12px] sm:text-[13px] font-semibold text-muted">{label}</p>
        </div>
        {sublabel && (
          <span className="shrink-0 text-[11px] sm:text-[11px] font-medium text-muted/70 lowercase">
            {sublabel}
          </span>
        )}
      </div>
      <p className="mt-1.5 sm:mt-2 truncate text-[18px] sm:text-[22px] font-bold tracking-tight text-ink tabular-nums">
        {formatMoney(amount)}
      </p>
    </div>
  );
}
