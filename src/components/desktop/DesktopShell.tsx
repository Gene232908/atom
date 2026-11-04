import { useMemo, useState, type ReactNode } from 'react';
import { KeyRound, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { useAuth, useUser } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { navigate, type Route } from '../../hooks/useRoute';
import { formatMoney } from '../../lib/money';
import { computeTotals, sumOwed } from '../../lib/items';
import { computeLoanStats } from '../../lib/loanUtils';
import { useAllItems, type GroupItem } from '../../hooks/useAllItems';
import type { Group } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { CreateGroupSheet } from '../home/CreateGroupSheet';
import { CreateLoanSheet } from '../loan/CreateLoanSheet';
import { JoinCodeSheet } from '../home/JoinCodeSheet';

const SIDEBAR = 'w-[260px]';

/** Laptop / PC frame: fixed sidebar on the left, page content on the right. */
export function DesktopShell({ route, children }: { route: Route; children: ReactNode }) {
  const user = useUser();
  const { signOut } = useAuth();
  const { groups: savedGroups } = useGroups();
  // Same live listeners as the overview (Firebase shares them), so balances are always current.
  const { items } = useAllItems(savedGroups);
  const groups = useMemo(() => {
    const byGroup = new Map<string, GroupItem[]>();
    for (const it of items) byGroup.set(it.group.id, [...(byGroup.get(it.group.id) ?? []), it]);
    return savedGroups.map((g) => (byGroup.has(g.id) ? { ...g, totals: computeTotals(byGroup.get(g.id)!, g.ownerId) } : g));
  }, [savedGroups, items]);
  const [panel, setPanel] = useState<'create' | 'join' | 'create_loan' | null>(null);
  const name = user.displayName || user.email || 'You';

  // Robust loan classification: checks groupType or if items inside have isPersonalLoan
  const isLoanGroup = (g: Group) => {
    if (g.groupType === 'loan') return true;
    const groupItems = items.filter((it) => it.group.id === g.id);
    return groupItems.some((it) => it.isPersonalLoan);
  };

  // Organized into three distinct categories matching mobile view:
  // 1. You lend (cards you created to lend money to others)
  // 2. You owe (cards you joined where you owe money)
  // 3. My Loan (self-loans where you pay personal installments)
  const lending = groups.filter((g) => g.ownerId === user.uid && !isLoanGroup(g));
  const owing = groups.filter((g) => g.ownerId !== user.uid && !isLoanGroup(g));
  const myLoans = groups.filter((g) => isLoanGroup(g));
  const activeId = route.name === 'group' ? route.id : null;

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className={`fixed inset-y-0 left-0 z-30 flex ${SIDEBAR} flex-col border-r border-hairline bg-white`}>
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <img src="/icon.svg" alt="" className="size-8 rounded-[10px]" />
          <span className="text-[17px] font-bold tracking-tight">Utang List</span>
        </div>

        <nav className="px-3">
          <SideLink active={route.name === 'home'} onClick={() => navigate('/')} icon={<LayoutDashboard className="size-[18px]" />}>
            Overview
          </SideLink>
        </nav>

        <div className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <ListGroup title="You lend" count={lending.length} groups={lending} uid={user.uid} activeId={activeId} />
          <ListGroup title="You owe" count={owing.length} groups={owing} uid={user.uid} activeId={activeId} />
          <ListGroup title="My Loan" count={myLoans.length} groups={myLoans} uid={user.uid} activeId={activeId} isLoan items={items} />

          <div className="mt-4 space-y-0.5">
            <SideLink onClick={() => setPanel('create')} icon={<Plus className="size-[18px]" />}>
              Add a card
            </SideLink>
            <SideLink onClick={() => setPanel('create_loan')} icon={<Plus className="size-[18px]" />}>
              Add a loan
            </SideLink>
            <SideLink onClick={() => setPanel('join')} icon={<KeyRound className="size-[18px]" />}>
              Join a card
            </SideLink>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-4">
          <Avatar name={name} photo={user.photoURL ?? ''} size="sm" ring="subtle" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{user.displayName || 'You'}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-bad/10 hover:text-bad"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="pl-[260px]">{children}</div>

      <CreateGroupSheet open={panel === 'create'} onClose={() => setPanel(null)} />
      <CreateLoanSheet open={panel === 'create_loan'} onClose={() => setPanel(null)} />
      <JoinCodeSheet open={panel === 'join'} onClose={() => setPanel(null)} />
    </div>
  );
}

function SideLink({
  active = false,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium transition ${
        active ? 'bg-accent/10 text-accent font-semibold' : 'text-ink/80 hover:bg-fill'
      }`}
    >
      <span className={active ? 'text-accent' : 'text-muted'}>{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}

function ListGroup({
  title,
  count,
  groups,
  uid,
  activeId,
  isLoan = false,
  items = [],
}: {
  title: string;
  count?: number;
  groups: Group[];
  uid: string;
  activeId: string | null;
  isLoan?: boolean;
  items?: GroupItem[];
}) {
  return (
    <div className="mt-3.5">
      <div className="flex items-center justify-between px-3 pb-1">
        <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</p>
        {typeof count === 'number' && (
          <span className="text-[11px] font-medium text-muted/70 tabular-nums">{count}</span>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="px-3 py-1 text-[12px] text-muted/40 italic">No cards</p>
      ) : (
        <div className="space-y-0.5">
        {groups.map((g) => {
          let label = 'Paid';
          let tone = 'text-muted/60';

          if (isLoan) {
            const groupItems = items.filter((it) => it.group.id === g.id);
            const remaining = groupItems.reduce((sum, it) => {
              const stats = computeLoanStats(it);
              return sum + stats.remainingCents;
            }, 0);

            if (remaining > 0) {
              label = formatMoney(remaining).replace('.00', '');
              tone = 'text-bad-ink';
            } else {
              label = 'Paid';
              tone = 'text-muted/60';
            }
          } else {
            const isOwner = g.ownerId === uid;
            const amount = isOwner ? sumOwed(g.totals) : (g.totals[uid] ?? 0);
            if (amount > 0) {
              label = formatMoney(amount).replace('.00', '');
              tone = isOwner ? 'text-ok-ink' : 'text-bad-ink';
            } else {
              label = 'Paid';
              tone = 'text-muted/60';
            }
          }

          const active = g.id === activeId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => navigate(`/g/${g.id}`)}
              className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
                active ? 'bg-accent/10' : 'hover:bg-fill/70'
              }`}
            >
              <span className={`min-w-0 flex-1 truncate text-[13px] ${active ? 'font-semibold text-accent' : 'font-medium text-ink/80'}`}>
                {g.name}
              </span>
              <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${tone}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
