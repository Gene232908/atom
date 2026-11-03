import { useEffect, useState } from 'react';
import { Check, Copy, Download, QrCode, ShoppingBag } from 'lucide-react';
import { loadQr } from '../../services/groups';
import { copyText } from '../../lib/clipboard';
import { listGradient, storeGradient } from '../../lib/cardTheme';
import { friendlyError } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { firstName } from '../../lib/items';
import type { Group, Item } from '../../lib/types';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { WalletCard } from '../ui/WalletCard';

interface Props {
  open: boolean;
  onClose: () => void;
  group: Group;
  /** Paying for one item. When null, paying for everything. */
  item: Item | null;
  totalCents: number;
  unpaidCount: number;
  onPaid: (item: Item | null) => void;
}

/** Where and how much to pay. The QR picture only downloads when this opens. */
export function PaySheet({ open, onClose, group, item, totalCents, unpaidCount, onPaid }: Props) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');

  useEffect(() => {
    if (!open || !group.hasQr) return;
    let alive = true;
    setLoading(true);
    setError('');
    loadQr(group.id)
      .then((img) => alive && setQr(img))
      .catch((err) => alive && setError(friendlyError(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, group.id, group.hasQr]);

  const copyNote = async () => {
    if (await copyText(group.paymentNote)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  const amount = item ? item.splitCents : totalCents;
  const nothing = !group.hasQr && !group.paymentNote;
  const canMark = item ? true : unpaidCount > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pay now"
      description={`Send your payment to ${ownerName}, then tap the button below.`}
      footer={
        canMark && amount > 0 ? (
          <Button size="lg" full icon={<Check className="size-5" strokeWidth={2.5} />} onClick={() => onPaid(item)}>
            I already paid {formatMoney(amount)}
          </Button>
        ) : undefined
      }
    >
      <WalletCard
        seed={item?.id ?? group.id}
        background={item ? storeGradient(item.store, item.id, item.color) : listGradient(group.id, group.color)}
        className="p-5"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-[0.12em] uppercase">
            {item ? item.store.trim() || 'Item' : group.name}
          </p>
        </div>
        <p className="mt-2 line-clamp-2 text-[14px] text-white/85">
          {item ? item.description : `All ${unpaidCount} unpaid ${unpaidCount === 1 ? 'item' : 'items'}`}
        </p>
        <p className="mt-4 text-[11px] font-medium text-white/70">Amount to pay</p>
        <p className="text-[34px] leading-tight font-bold tracking-tight tabular-nums wrap-break-word">
          {formatMoney(amount)}
        </p>
        <p className="mt-1 text-[12px] text-white/75">Pay to {group.members[group.ownerId]?.name ?? ownerName}</p>
      </WalletCard>

      {nothing && (
        <div className="mt-4 rounded-[20px] bg-white p-5 text-center">
          <QrCode className="mx-auto size-8 text-muted" />
          <p className="mt-2 text-[14px] text-muted">
            {ownerName} has not added payment details yet. Please message them to ask where to pay.
          </p>
        </div>
      )}

      {group.paymentNote && (
        <div className="mt-4 rounded-[20px] bg-white p-4">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-[13px] font-medium text-muted">Payment details</p>
            <button
              type="button"
              onClick={copyNote}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-fill px-2.5 text-[12px] font-semibold text-accent"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-1.5 text-[16px] font-semibold wrap-break-word whitespace-pre-wrap">{group.paymentNote}</p>
        </div>
      )}

      {group.hasQr && (
        <div className="mt-4 rounded-[20px] bg-white p-4 text-center">
          <p className="text-[13px] font-medium text-muted">Scan to pay</p>
          {loading ? (
            <div className="grid h-64 place-items-center text-muted">
              <Spinner className="size-7" />
            </div>
          ) : error ? (
            <p className="py-10 text-[14px] text-bad">{error}</p>
          ) : qr ? (
            <>
              <img src={qr} alt="Payment QR code" className="mx-auto mt-3 max-h-[55dvh] w-auto max-w-full rounded-2xl object-contain" />
              <p className="mt-2 text-[12px] text-muted">Tip: press and hold the picture to save it.</p>
              <a
                href={qr}
                download={`${group.name.replace(/[^\w-]+/g, '-') || 'payment'}-qr.jpg`}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-fill px-4 text-[13px] font-semibold text-accent transition active:scale-95"
              >
                <Download className="size-4" />
                Save QR picture
              </a>
            </>
          ) : (
            <p className="py-10 text-[14px] text-muted">The QR picture was removed.</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
