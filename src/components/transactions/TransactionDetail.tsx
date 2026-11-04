import { useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Store } from 'lucide-react';
import { itemGradient } from '../../lib/cardTheme';
import { copyText } from '../../lib/clipboard';
import { formatMoney } from '../../lib/money';
import { cleanRef, confirmedPaid, firstName } from '../../lib/items';
import { remainingFor } from '../../lib/itemStatus';
import { fullDate, timeLabel, type Transaction } from '../../lib/transactions';
import { Avatar } from '../ui/Avatar';
import { FullScreen } from '../ui/FullScreen';

interface Props {
  tx: Transaction;
  uid: string;
  onClose: () => void;
  onOpenItem: () => void;
}

const card = 'overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-hairline/80';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-[13px] text-muted">{label}</span>
      <span className="min-w-0 text-right text-[13.5px] font-medium text-ink">{children}</span>
    </div>
  );
}

/** One payment in detail: amount, status, who, which card, when, and the reference. */
export function TransactionDetail({ tx, uid, onClose, onOpenItem }: Props) {
  const [copied, setCopied] = useState(false);
  const { item, payment } = tx;
  const { group } = item;
  const received = tx.direction === 'in';

  const ref = cleanRef(payment.refNumber);
  const time = timeLabel(tx.at);
  const store = (item.store || '').trim();
  const confirmedBy = group.ownerId === uid ? 'you' : firstName(group.members[group.ownerId]?.name ?? 'the lender');

  const share = item.splitCents;
  const paid = confirmedPaid(item, payment.uid);
  const left = remainingFor(item, payment.uid);
  const pct = share > 0 ? Math.min(100, Math.round((paid / share) * 100)) : 0;
  const payer = received ? firstName(tx.otherName) : 'You';

  const copyRef = async () => {
    if (await copyText(ref)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <FullScreen label="Transaction details" onClose={onClose} zIndex="z-[45]">
      <button
        type="button"
        onClick={onClose}
        aria-label="Back"
        className="grid size-9 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-hairline transition active:scale-90"
      >
        <ChevronLeft className="size-5" strokeWidth={2.4} />
      </button>

      {/* Amount */}
      <div className="mt-4 text-center">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${
            received ? 'bg-ok/12 text-ok-ink' : 'bg-fill text-ink/70'
          }`}
        >
          {received ? 'Received' : 'Sent'}
        </span>
        <p className="mt-3 text-[44px] leading-none font-bold tracking-tight text-ink tabular-nums">
          {formatMoney(payment.amountCents)}
        </p>
        <p className="mx-auto mt-3 max-w-xs text-[14px] leading-snug text-muted">
          {item.description}
          <span className="block">{[fullDate(tx.at), time].filter(Boolean).join(', ')}</span>
        </p>
      </div>

      {/* Status */}
      <div className={`${card} mt-7`}>
        <div className="px-4 pt-3.5 pb-3">
          <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <CheckCircle2 className="size-4 text-ok" />
            Status: Confirmed
          </p>
          <p className="mt-0.5 text-[13px] text-muted">
            Confirmed by {confirmedBy} · {group.name}
          </p>
        </div>
        <div className="border-t border-hairline px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-ink">Total</span>
            <span className="text-[14px] font-semibold text-ink tabular-nums">{formatMoney(payment.amountCents)}</span>
          </div>
          {share > 0 && left > 0 && (
            <div className="mt-2.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-fill">
                <div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-[12px] text-muted">
                {formatMoney(paid)} of {formatMoney(share)} paid so far
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Where it was for: the card colors stand in for a map */}
      <div className={`${card} mt-3`}>
        <div className="relative h-[120px] overflow-hidden" style={{ backgroundImage: itemGradient(item, group) }}>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 50%), linear-gradient(to top, rgba(0,0,0,0.16), transparent 55%)',
            }}
          />
          <Store aria-hidden className="absolute -right-3 -bottom-4 size-28 -rotate-12 text-white/15" strokeWidth={1.6} />
          <div className="relative flex h-full flex-col justify-end p-4 text-white">
            <p className="text-[11px] font-semibold tracking-widest text-white/80 uppercase">{group.name}</p>
            <p className="truncate text-[20px] leading-tight font-bold">{store || item.description}</p>
          </div>
        </div>
        <p className="px-4 py-3 text-[14px] font-medium text-ink">{item.description}</p>
      </div>

      {/* Details */}
      <div className={`${card} mt-3 divide-y divide-hairline`}>
        <Row label={received ? 'Received from' : 'Paid to'}>
          <span className="inline-flex items-center gap-2">
            <Avatar name={tx.otherName} photo={tx.otherPhoto} size="xs" />
            <span className="truncate">{tx.otherName}</span>
          </span>
        </Row>
        <Row label="Card">{group.name}</Row>
        {store && <Row label="Store">{store}</Row>}
        <Row label="Date">{fullDate(tx.at)}</Row>
        {time && <Row label="Time">{time}</Row>}
        <Row label={`${payer === 'You' ? 'Your' : `${payer}'s`} share`}>{formatMoney(share)}</Row>
        <Row label="Still to pay">
          {left > 0 ? formatMoney(left) : <span className="text-ok-ink">Fully paid</span>}
        </Row>
        {payment.note && <Row label="Note">{payment.note}</Row>}
        {ref && (
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="shrink-0 text-[13px] text-muted">Reference</span>
            <button
              type="button"
              onClick={copyRef}
              className="flex min-w-0 items-center gap-1.5 text-right text-[13.5px] font-medium text-ink transition active:opacity-60"
            >
              <span className="truncate font-mono">{ref}</span>
              <Copy className="size-3.5 shrink-0 text-muted" />
              {copied && <span className="shrink-0 text-[12px] text-ok-ink">Copied</span>}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenItem}
        className={`${card} mt-4 flex h-12 w-full items-center justify-between px-4 text-[15px] font-medium text-accent transition active:bg-fill`}
      >
        View item
        <ChevronRight className="size-4 text-muted/60" />
      </button>
      <p className="mt-2 px-4 text-[12px] leading-snug text-muted">
        See everyone in this item and all of its payments.
      </p>
    </FullScreen>
  );
}
