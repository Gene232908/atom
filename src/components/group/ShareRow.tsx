import { useState } from 'react';
import { Check, Clock, Copy, X } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { copyText } from '../../lib/clipboard';
import { confirmedPaid, firstName } from '../../lib/items';
import type { Group, Item, Share, ShareStatus } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  personUid: string;
  share?: Share;
  item: Item;
  group: Group;
  viewerUid: string;
  /** 'paid' + amount = lender received it. 'unpaid' = undo a confirmed payment. */
  onSetStatus: (personUid: string, status: ShareStatus, amountCents?: number) => void;
  /** Lender says they did NOT receive the payment. */
  onReject: (personUid: string) => void;
}

/** Amount the person says they sent but the lender has not confirmed yet. */
function sentAmount(item: Item, uid: string, share?: Share): number {
  if (share?.status !== 'claimed') return 0;
  if (share.claimCents && share.claimCents > 0) return share.claimCents;
  const pending = (item.payments ?? [])
    .filter((p) => p.uid === uid && p.status === 'pending')
    .reduce((sum, p) => sum + (p.amountCents || 0), 0);
  return pending;
}

const yesBtn = 'h-9 flex-1 rounded-full bg-ok text-[13px] font-semibold text-white transition active:scale-95';
const noBtn = 'h-9 flex-1 rounded-full bg-white text-[13px] font-semibold text-bad ring-1 ring-hairline transition active:scale-95';

export function ShareRow({ personUid, share, item, group, viewerUid, onSetStatus, onReject }: Props) {
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLenderView = group.ownerId === viewerUid;
  const isMe = personUid === viewerUid;
  const isLender = personUid === group.ownerId;
  const member = group.members[personUid];
  const name = member?.name ?? share?.name ?? 'Member';
  const status: ShareStatus = share?.status ?? 'unpaid';

  const paid = confirmedPaid(item, personUid);
  const left = Math.max(0, item.splitCents - paid);
  const sent = sentAmount(item, personUid, share);
  const askAmount = Math.min(left, sent || left);
  const lenderName = firstName(group.members[group.ownerId]?.name ?? 'The lender');

  let detail = '';
  if (isLender) detail = 'Lender';
  else if (status === 'paid') detail = formatMoney(item.splitCents);
  else if (paid > 0) detail = `${formatMoney(left)} left`;
  else detail = `${formatMoney(left)} to pay`;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} photo={member?.photo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-ink">{isMe ? 'You' : name}</p>
          <div className="flex min-w-0 items-center gap-2">
            {!isLender &&
              (status === 'unpaid' && paid > 0 ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-accent">
                  <span className="size-1.5 rounded-full bg-accent" />
                  Partly paid
                </span>
              ) : (
                <StatusBadge status={status} />
              ))}
            <span className="truncate text-[12px] text-muted">{detail}</span>
          </div>
        </div>

        {/* Lender actions: one button, one question */}
        {isLenderView && !isLender && !asking && status !== 'claimed' && (
          status === 'paid' ? (
            <button
              type="button"
              onClick={() => onSetStatus(personUid, 'unpaid')}
              className="h-8 shrink-0 rounded-full bg-fill px-3.5 text-[12px] font-semibold text-ink active:scale-95"
            >
              Undo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAsking(true)}
              className="h-8 shrink-0 rounded-full bg-ok px-3.5 text-[12px] font-semibold text-white active:scale-95"
            >
              Mark paid
            </button>
          )
        )}
      </div>

      {/* The person said they paid: lender answers Yes or No */}
      {status === 'claimed' && isLenderView && (
        <div className="mt-2.5 rounded-2xl bg-warn/10 p-3">
          <p className="text-[13px] text-ink">
            <span className="font-semibold">{firstName(name)}</span> says they sent{' '}
            <span className="font-semibold tabular-nums">{formatMoney(askAmount)}</span>
          </p>
          {share?.refNumber && <RefLine value={share.refNumber} copied={copied} onCopy={() => {
            copyText(share.refNumber!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }} />}
          <p className="mt-2 text-[12px] font-medium text-muted">Did you receive {formatMoney(askAmount)}?</p>
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={() => onReject(personUid)} className={noBtn}>
              <X className="mr-1 inline size-3.5" strokeWidth={2.5} />
              No
            </button>
            <button type="button" onClick={() => onSetStatus(personUid, 'paid', askAmount)} className={yesBtn}>
              <Check className="mr-1 inline size-3.5" strokeWidth={2.5} />
              Yes
            </button>
          </div>
        </div>
      )}

      {/* Lender marks paid without a claim: same simple question */}
      {asking && (
        <div className="mt-2.5 rounded-2xl bg-canvas p-3">
          <p className="text-[13px] text-ink">
            Did you receive <span className="font-semibold tabular-nums">{formatMoney(left)}</span> from {firstName(name)}?
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setAsking(false)} className={noBtn}>
              No
            </button>
            <button
              type="button"
              onClick={() => {
                onSetStatus(personUid, 'paid', left);
                setAsking(false);
              }}
              className={yesBtn}
            >
              Yes
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted">Got a different amount? Use “Record a payment” below.</p>
        </div>
      )}

      {/* What the person who owes sees about their own share */}
      {isMe && !isLenderView && status === 'claimed' && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-warn/10 px-3 py-2 text-[12px] text-warn-ink">
          <Clock className="size-3.5 shrink-0" />
          You sent {formatMoney(sent || left)}. Waiting for {lenderName} to confirm.
        </p>
      )}
      {isMe && !isLenderView && status === 'unpaid' && (share?.rejectedCents ?? 0) > 0 && (
        <p className="mt-2 rounded-xl bg-bad/10 px-3 py-2 text-[12px] text-bad-ink">
          {lenderName} did not receive your {formatMoney(share!.rejectedCents!)} payment. Please check with them, then pay again.
        </p>
      )}
    </div>
  );
}

function RefLine({ value, copied, onCopy }: { value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5">
      <span className="truncate font-mono text-[12px] text-ink">{value}</span>
      <button type="button" onClick={onCopy} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-accent">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
