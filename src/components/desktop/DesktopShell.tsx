import { useState, type ReactNode } from 'react';
import { KeyRound, LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { useAuth, useUser } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { navigate, type Route } from '../../hooks/useRoute';
import { groupGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { sumOwed } from '../../lib/items';
import type { Group } from '../../lib/types';
import { Avatar } from '../ui/Avatar';
import { CreateGroupSheet } from '../home/CreateGroupSheet';
import { JoinCodeSheet } from '../home/JoinCodeSheet';

const SIDEBAR = 'w-[260px]';

/** Laptop / PC frame: fixed sidebar on the left, page content on the right. */
export function DesktopShell({ route, children }: { route: Route; children: ReactNode }) {
  const user = useUser();
  const { signOut } = useAuth();
  const { groups } = useGroups();
  const [panel, setPanel] = useState<'create' | 'join' | null>(null);
  const name = user.displayName || user.email || 'You';

  const lending = groups.filter((g) => g.ownerId === user.uid);
  const owing = groups.filter((g) => g.ownerId !== user.uid);
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
          <ListGroup title="You lend" groups={lending} uid={user.uid} activeId={activeId} />
          <ListGroup title="You owe" groups={owing} uid={user.uid} activeId={activeId} />

          <div className="mt-4 space-y-0.5">
            <SideLink onClick={() => setPanel('create')} icon={<Plus className="size-[18px]" />}>
              Add a card
            </SideLink>
            <SideLink onClick={() => setPanel('join')} icon={<KeyRound className="size-[18px]" />}>
              Join a card
            </SideLink>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-4">
          <Avatar name={name} photo={user.photoURL ?? ''} size="sm" />
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
        active ? 'bg-ink text-white' : 'text-ink/80 hover:bg-fill'
      }`}
    >
      <span className={active ? 'text-white' : 'text-muted'}>{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}

function ListGroup({ title, groups, uid, activeId }: { title: string; groups: Group[]; uid: string; activeId: string | null }) {
  if (groups.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{title}</p>
      <div className="space-y-0.5">
        {groups.map((g) => {
          const isOwner = g.ownerId === uid;
          const amount = isOwner ? sumOwed(g.totals) : (g.totals[uid] ?? 0);
          const active = g.id === activeId;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => navigate(`/g/${g.id}`)}
              className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
                active ? 'bg-fill' : 'hover:bg-fill/70'
              }`}
            >
              <span className="size-3 shrink-0 rounded-[4px]" style={{ backgroundImage: groupGradient(g) }} />
              <span className={`min-w-0 flex-1 truncate text-[13px] ${active ? 'font-semibold text-ink' : 'font-medium text-ink/80'}`}>
                {g.name}
              </span>
              <span className={`shrink-0 text-[11px] font-semibold tabular-nums ${amount > 0 ? (isOwner ? 'text-ok-ink' : 'text-bad-ink') : 'text-muted/60'}`}>
                {amount > 0 ? formatMoney(amount).replace('.00', '') : 'Paid'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
