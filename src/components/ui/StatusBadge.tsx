import type { ShareStatus } from '../../lib/types';

const STYLES: Record<ShareStatus, { dot: string; text: string; label: string }> = {
  unpaid: { dot: 'bg-bad', text: 'text-bad-ink', label: 'Not paid' },
  claimed: { dot: 'bg-warn', text: 'text-warn-ink', label: 'Waiting' },
  paid: { dot: 'bg-ok', text: 'text-ok-ink', label: 'Paid' },
};

export function StatusBadge({ status }: { status?: ShareStatus }) {
  const s = (status && STYLES[status]) || STYLES.unpaid;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${s.text}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
