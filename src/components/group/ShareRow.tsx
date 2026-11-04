import { useState } from 'react';
import { Check, Clock, Copy } from 'lucide-react';
import { centsToInput, cleanMoneyInput, formatMoney, toCents } from '../../lib/money';
import { copyText } from '../../lib/clipboard';
import { confirmedPaid } from '../../lib/items';
import type { Group, Item, Share, ShareStatus } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  personUid: string;
  share?: Share;
  item: Item;
  group: Group;
  viewerUid: string;
  /** amountCents is only used when the lender marks a payment as received. */
  onSetStatus: (personUid: string, status: ShareStatus, amountCents?: number) => void;
}

/** Amount the person says they sent but the lender has not confirmed yet. */
function pendingAmount(item: Item, uid: string, share?: Share): number {
  if (share?.status !== 'claimed') return 0;
  if (share.claimCents && share.claimCents > 0) return share.claimCents;
  return (item.payments ?? [])
    .filter((p) => p.uid === uid && p.status === 'pending')
    .reduce((sum, p) => sum + (p.amountCents || 0), 0);
}

export function ShareRow({ personUid, share, item, group, viewerUid, onSetStatus }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState('');

  const ownerViewing = group.ownerId === viewerUid;
  const member = group.members[personUid];
  const name = member?.name ?? share?.name ?? 'Member';
  const isLender = personUid === group.ownerId;
  const status: ShareStatus = share?.status ?? 'unpaid';

  const paid = confirmedPaid(item, personUid);
  const left = Math.max(0, item.splitCents - paid);
  const sent = pendingAmount(item, personUid, share);
  const canManage = ownerViewing && !isLender;

  const openConfirm = () => {
    setAmount(centsToInput(Math.min(left, sent || left)));
    setConfirming(true);
  };
  const typed = toCents(amount) ?? 0;
  const tooMuch = typed > left;

  let note = '';
  if (isLender) note = 'Lender’s share';
  else if (!member) note = 'Removed';
  else if (status !== 'paid' && paid > 0) note = `Paid ${formatMoney(paid)} of ${formatMoney(item.splitCents)}`;

  return (
    <div className="px-4 py-3">
      <div className="flex min-h-[44px] items-center gap-3">
        <Avatar name={name} photo={member?.photo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{personUid === viewerUid ? 'You' : name}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <StatusBadge status={status} />
            {note && <span className="truncate text-[12px] text-muted">{note}</span>}
          </div>
        </div>
        {canManage && !confirming && (
          status === 'paid' ? (
            <button
              type="button"
              onClick={() => onSetStatus(personUid, 'unpaid')}
              className="h-9 shrink-0 rounded-full bg-fill px-4 text-[13px] font-semibold text-ink transition active:scale-95"
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={openConfirm}
              className="h-9 shrink-0 rounded-full bg-ok px-4 text-[13px] font-semibold text-white transition active:scale-95"
            >
              {status === 'claimed' ? 'Confirm' : 'Mark paid'}
            </button>
          )
        )}
      </div>

      {/* What the person says they sent */}
      {status === 'claimed' && (ownerViewing || personUid === viewerUid) && !confirming && (
        <div className="mt-2.5 rounded-2xl bg-warn/10 px-3.5 py-3 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-warn-ink">
              <Clock className="size-4" />
              {ownerViewing ? 'Says they sent' : 'You sent'}
            </span>
            <span className="font-bold text-ink tabular-nums">{sent > 0 ? formatMoney(sent) : 'Amount not given'}</span>
          </div>
          {share?.refNumber && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
              <span className="truncate font-mono text-[13px] font-semibold text-ink">Ref: {share.refNumber}</span>
              <button
                type="button"
                onClick={() => {
                  copyText(share.refNumber!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent"
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
          <p className="mt-2 text-[12px] text-muted">
            {ownerViewing ? 'Check your GCash or bank first, then tap Confirm.' : 'Waiting for the lender to confirm.'}
          </p>
        </div>
      )}

      {/* Lender types the amount actually received */}
      {confirming && (
        <div className="mt-2.5 rounded-2xl bg-canvas p-3.5">
          <label htmlFor={`amt-${item.id}-${personUid}`} className="text-[13px] font-semibold text-ink">
            How much did you receive?
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3.5 ring-1 ring-hairline focus-within:ring-2 focus-within:ring-accent">
            <span className="font-semibold text-muted">₱</span>
            <input
              id={`amt-${item.id}-${personUid}`}
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(cleanMoneyInput(e.target.value))}
              className="h-11 w-full min-w-0 bg-transparent text-[16px] font-semibold text-ink outline-none"
            />
          </div>
          <p className={`mt-1.5 text-[12px] ${tooMuch ? 'font-semibold text-bad' : 'text-muted'}`}>
            {tooMuch
              ? `That is more than what is left (${formatMoney(left)}).`
              : `Still owes ${formatMoney(left)}. Type less for a partial payment.`}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="h-10 flex-1 rounded-full bg-white text-[14px] font-semibold text-ink ring-1 ring-hairline active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={typed <= 0 || tooMuch}
              onClick={() => {
                onSetStatus(personUid, 'paid', typed);
                setConfirming(false);
              }}
              className="h-10 flex-1 rounded-full bg-ok text-[14px] font-semibold text-white active:scale-95 disabled:opacity-40"
            >
              {typed > 0 && typed < left ? `Confirm ${formatMoney(typed)}` : 'Confirm full'}
            </button>
          </div>
        </div>
      )}

      {status === 'paid' && share?.refNumber && (
        <p className="mt-1 pl-11 font-mono text-[12px] text-muted">Ref: {share.refNumber}</p>
      )}
    </div>
  );
}
