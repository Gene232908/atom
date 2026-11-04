import { CheckCircle2, UserPlus } from 'lucide-react';
import type { PersonSummary } from '../../lib/types';

interface Props {
  inviteCode: string;
  otherMembers: PersonSummary[];
  itemCount: number;
  waitingCount: number;
  onInvite: () => void;
  onSettings: () => void;
}

/** Lender-only tips on phones: invite people when empty, celebrate when everything is paid. */
export function OwnerBanners({ inviteCode, otherMembers, itemCount, waitingCount, onInvite, onSettings }: Props) {
  if (otherMembers.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[20px] bg-accent/10 p-4 ring-1 ring-accent/20">
        <div className="flex items-center gap-2.5">
          <UserPlus className="size-5 shrink-0 text-accent" />
          <div>
            <p className="text-[14px] font-semibold text-ink">Waiting for members to join</p>
            <p className="text-[12px] text-muted">No members yet. Share code {inviteCode} so others can join.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onInvite}
          className="rounded-full bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-accent/90 active:scale-95"
        >
          Invite
        </button>
      </div>
    );
  }

  const allSettled =
    itemCount > 0 &&
    waitingCount === 0 &&
    otherMembers.every((p) => p.owes === 0) &&
    otherMembers.some((p) => p.paid > 0);
  if (!allSettled) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-ok/10 p-4 ring-1 ring-ok/20">
      <div className="flex items-center gap-2.5">
        <CheckCircle2 className="size-5 shrink-0 text-ok" />
        <div>
          <p className="text-[14px] font-semibold text-ink">All debts settled!</p>
          <p className="text-[12px] text-muted">You can delete this card in Settings.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSettings}
        className="rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-ink shadow-sm ring-1 ring-hairline transition hover:bg-canvas"
      >
        Settings
      </button>
    </div>
  );
}
