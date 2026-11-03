import { listGradient } from '../../lib/cardTheme';
import { navigate } from '../../hooks/useRoute';
import { formatMoney } from '../../lib/money';
import { firstName, sumOwed } from '../../lib/items';
import type { Group } from '../../lib/types';
import { WalletCard } from '../ui/WalletCard';
import { AvatarStack } from '../ui/AvatarStack';

/** One list shown as a wallet card. Only the top strip shows when stacked on phones. */
export function GroupWalletCard({ group, uid, index }: { group: Group; uid: string; index: number }) {
  const isOwner = group.ownerId === uid;
  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'the lender');
  const amount = isOwner ? sumOwed(group.totals) : (group.totals[uid] ?? 0);
  const people = group.memberIds
    .filter((id) => id !== group.ownerId)
    .map((id) => group.members[id])
    .filter(Boolean);

  return (
    <button
      type="button"
      onClick={() => navigate(`/g/${group.id}`)}
      className="block w-full animate-rise text-left transition-transform duration-300 hover:-translate-y-1.5 active:scale-[0.98]"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <WalletCard seed={group.id} background={listGradient(group.id, group.color)} className="flex h-[196px] flex-col p-5">
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 truncate text-[17px] font-semibold">{group.name}</p>
          <p className="shrink-0 text-[17px] font-semibold tabular-nums">
            {amount > 0 ? formatMoney(amount) : 'Paid ✓'}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[12px] font-medium text-white/75">
          {isOwner
            ? amount > 0
              ? 'Left to collect'
              : 'Nothing to collect'
            : amount > 0
              ? `You owe ${ownerName}`
              : `All paid to ${ownerName}`}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
              {isOwner ? 'You lend' : 'You borrow'}
            </p>
            <p className="mt-0.5 font-mono text-[15px] tracking-[0.18em] text-white/90">
              •••• {group.inviteCode.slice(-4) || '0000'}
            </p>
          </div>
          {people.length > 0 && <AvatarStack people={people} />}
        </div>
      </WalletCard>
    </button>
  );
}

/** Stacked like Apple Wallet on phones, a neat grid on tablets and laptops. */
export function WalletStack({ groups, uid }: { groups: Group[]; uid: string }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {groups.map((g, i) => (
        <div key={g.id} className={`relative min-w-0 ${i > 0 ? 'max-sm:-mt-[124px]' : ''}`} style={{ zIndex: i }}>
          <GroupWalletCard group={g} uid={uid} index={i} />
        </div>
      ))}
    </div>
  );
}
