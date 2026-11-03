import { useState } from 'react';
import { Check, Clock, Copy } from 'lucide-react';
import { formatMoney } from '../../lib/money';
import { copyText } from '../../lib/clipboard';
import type { Group, Share, ShareStatus } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  personUid: string;
  share?: Share;
  group: Group;
  viewerUid: string;
  onSetStatus: (personUid: string, status: ShareStatus) => void;
}

interface Action {
  label: string;
  next: ShareStatus;
  style: string;
}

function actionFor(ownerViewing: boolean, personUid: string, ownerId: string, status: ShareStatus): Action | null {
  if (personUid === ownerId) return null;
  if (ownerViewing) {
    if (status === 'claimed') {
      return { label: 'Confirm payment', next: 'paid', style: 'bg-ok text-white font-bold shadow-sm hover:bg-ok/90' };
    }
    if (status === 'paid') {
      return { label: 'Undo', next: 'unpaid', style: 'bg-fill text-ink hover:bg-black/10' };
    }
    return { label: 'Mark paid', next: 'paid', style: 'bg-ok text-white font-medium hover:bg-ok/90' };
  }
  // Borrowers use the "Pay now" card flow to pay, so no redundant button inside information
  return null;
}

export function ShareRow({ personUid, share, group, viewerUid, onSetStatus }: Props) {
  const [copied, setCopied] = useState(false);
  const ownerViewing = group.ownerId === viewerUid;
  const member = group.members[personUid];
  const name = member?.name ?? share?.name ?? 'Member';
  const isLender = personUid === group.ownerId;
  const status: ShareStatus = share?.status ?? 'unpaid';
  const action = actionFor(ownerViewing, personUid, group.ownerId, status);

  let note = '';
  if (isLender) note = 'Lender’s own share';
  else if (status === 'claimed' && ownerViewing) note = 'Submitted for verification';
  else if (!member) note = 'Removed';

  if (share?.paidCents && share.paidCents > 0 && status !== 'paid') {
    const paidText = `Paid ${formatMoney(share.paidCents)}`;
    note = note ? `${note} · ${paidText}` : paidText;
  }

  return (
    <div className="px-4 py-3">
      <div className="flex min-h-[48px] items-center gap-3">
        <Avatar name={name} photo={member?.photo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-ink">{personUid === viewerUid ? 'You' : name}</p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2">
            <StatusBadge status={status} />
            {note && <span className="truncate text-[12px] text-muted">{note}</span>}
          </div>
        </div>
        {action && (
          <button
            type="button"
            onClick={() => onSetStatus(personUid, action.next)}
            className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] transition active:scale-95 ${action.style}`}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Lender verification box: clearly displays payee reference number & amount to cross-check */}
      {status === 'claimed' && ownerViewing && (
        <div className="mt-2.5 rounded-xl bg-warn/10 border border-warn/25 p-2.5 text-[12px]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-warn-ink flex items-center gap-1.5">
              <Clock className="size-3.5 text-warn" />
              Payee submitted payment for verification
            </span>
            {share?.paidCents && share.paidCents > 0 && (
              <span className="font-bold text-ink">{formatMoney(share.paidCents)}</span>
            )}
          </div>
          {share?.refNumber ? (
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-1.5 ring-1 ring-hairline">
              <span className="font-mono text-[12px] font-bold text-accent truncate">
                Ref: {share.refNumber}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyText(share.refNumber!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline shrink-0"
              >
                {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-muted italic">No reference number submitted</p>
          )}
        </div>
      )}

      {status === 'paid' && share?.refNumber && (
        <p className="mt-1 pl-11 text-[11px] text-muted font-mono">
          Ref: {share.refNumber}
        </p>
      )}
    </div>
  );
}
