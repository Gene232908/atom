import { formatMoney } from '../../lib/money';
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
    return status === 'paid'
      ? { label: 'Undo', next: 'unpaid', style: 'bg-fill text-ink' }
      : { label: 'Mark paid', next: 'paid', style: 'bg-ok text-white' };
  }
  // Borrowers use the "Pay now" card flow to pay, so no redundant button inside information
  return null;
}

export function ShareRow({ personUid, share, group, viewerUid, onSetStatus }: Props) {
  const ownerViewing = group.ownerId === viewerUid;
  const member = group.members[personUid];
  const name = member?.name ?? share?.name ?? 'Member';
  const isLender = personUid === group.ownerId;
  const status: ShareStatus = share?.status ?? 'unpaid';
  const action = actionFor(ownerViewing, personUid, group.ownerId, status);

  let note = '';
  if (isLender) note = 'Lender’s own share';
  else if (status === 'claimed' && ownerViewing) note = 'Says they paid';
  else if (!member) note = 'Removed';

  if (share?.paidCents && share.paidCents > 0 && status !== 'paid') {
    const paidText = `Paid ${formatMoney(share.paidCents)}`;
    note = note ? `${note} · ${paidText}` : paidText;
  }
  if (share?.refNumber) {
    note = note ? `${note} · Ref: ${share.refNumber}` : `Ref: ${share.refNumber}`;
  }

  return (
    <div className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
      <Avatar name={name} photo={member?.photo} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{personUid === viewerUid ? 'You' : name}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <StatusBadge status={status} />
          {note && <span className="truncate text-[12px] text-muted">{note}</span>}
        </div>
      </div>
      {action && (
        <button
          type="button"
          onClick={() => onSetStatus(personUid, action.next)}
          className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-semibold transition active:scale-95 ${action.style}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
