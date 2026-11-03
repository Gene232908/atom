import type { Group, Share, ShareStatus } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  personUid: string;
  share: Share;
  group: Group;
  viewerUid: string;
  onSetStatus: (personUid: string, status: ShareStatus) => void;
}

interface Action {
  label: string;
  next: ShareStatus;
  style: string;
}

function actionFor(ownerViewing: boolean, viewerUid: string, personUid: string, ownerId: string, status: ShareStatus): Action | null {
  if (personUid === ownerId) return null;
  if (ownerViewing) {
    return status === 'paid'
      ? { label: 'Undo', next: 'unpaid', style: 'bg-fill text-ink' }
      : { label: 'Mark paid', next: 'paid', style: 'bg-ok text-white' };
  }
  if (personUid !== viewerUid) return null;
  if (status === 'unpaid') return { label: 'I paid', next: 'claimed', style: 'bg-ink text-white' };
  if (status === 'claimed') return { label: 'Undo', next: 'unpaid', style: 'bg-fill text-ink' };
  return null;
}

export function ShareRow({ personUid, share, group, viewerUid, onSetStatus }: Props) {
  const ownerViewing = group.ownerId === viewerUid;
  const member = group.members[personUid];
  const name = member?.name ?? share.name;
  const isLender = personUid === group.ownerId;
  const action = actionFor(ownerViewing, viewerUid, personUid, group.ownerId, share.status);

  let note = '';
  if (isLender) note = 'Lender’s own share';
  else if (share.status === 'claimed' && ownerViewing) note = 'Says they paid';
  else if (!member) note = 'Removed';

  return (
    <div className="flex min-h-[60px] items-center gap-3 px-4 py-2.5">
      <Avatar name={name} photo={member?.photo} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{personUid === viewerUid ? 'You' : name}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <StatusBadge status={share.status} />
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
