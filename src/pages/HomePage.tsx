import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, KeyRound, Plus, WalletCards } from 'lucide-react';
import { useUser } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { formatMoney } from '../lib/money';
import { firstName, sumOwed } from '../lib/items';
import { LargeTitle, NavBar, PageBody } from '../components/layout/AppHeader';
import { WalletStack } from '../components/home/GroupWalletCard';
import { CreateGroupSheet } from '../components/home/CreateGroupSheet';
import { JoinCodeSheet } from '../components/home/JoinCodeSheet';
import { AccountSheet } from '../components/home/AccountSheet';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { SectionLabel } from '../components/ui/Group';
import { Spinner } from '../components/ui/Spinner';

type Panel = 'create' | 'join' | 'account' | null;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const user = useUser();
  const { groups, loading, error, retry } = useGroups();
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const name = user.displayName || 'there';

  const { youOwe, owedToYou } = useMemo(() => {
    let owe = 0;
    let owed = 0;
    for (const g of groups) {
      if (g.ownerId === user.uid) owed += sumOwed(g.totals);
      else owe += g.totals[user.uid] ?? 0;
    }
    return { youOwe: owe, owedToYou: owed };
  }, [groups, user.uid]);

  const owing = groups.filter((g) => g.ownerId !== user.uid);
  const lending = groups.filter((g) => g.ownerId === user.uid);

  return (
    <>
      <NavBar
        title="Wallet"
        right={
          <>
            <IconButton label="New list" dark onClick={() => setPanel("create")}>
              <Plus className="size-5" strokeWidth={2.5} />
            </IconButton>
            <button
              type="button"
              onClick={() => setPanel('account')}
              aria-label="Your account"
              className="rounded-full transition active:scale-90"
            >
              <Avatar name={name} photo={user.photoURL ?? ''} size="sm" />
            </button>
          </>
        }
      />

      <PageBody>
        <LargeTitle eyebrow={`${greeting()}, ${firstName(name)}`} title="Wallet" />

        <div className="grid grid-cols-2 gap-3">
          <SummaryTile label="You owe" amount={youOwe} tone="bad" />
          <SummaryTile label="To collect" amount={owedToYou} tone="ok" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Button size="lg" icon={<Plus className="size-5" />} onClick={() => setPanel('create')}>
            New list
          </Button>
          <Button size="lg" variant="white" icon={<KeyRound className="size-[18px]" />} onClick={() => setPanel('join')}>
            Join
          </Button>
        </div>

        <div className="mt-8 space-y-8">
          {error && <ErrorBanner message={error} onRetry={retry} />}

          {loading ? (
            <div className="flex justify-center py-16 text-muted">
              <Spinner className="size-7" />
            </div>
          ) : groups.length === 0 ? (
            !error && (
              <EmptyState
                icon={<WalletCards className="size-7" />}
                title="Your wallet is empty"
                text="If people owe you money, tap New list. If a friend sent you an invite link, open it or tap Join."
              />
            )
          ) : (
            <>
              {owing.length > 0 && (
                <section>
                  <SectionLabel>You owe</SectionLabel>
                  <WalletStack groups={owing} uid={user.uid} />
                </section>
              )}
              {lending.length > 0 && (
                <section>
                  <SectionLabel>You lend</SectionLabel>
                  <WalletStack groups={lending} uid={user.uid} />
                </section>
              )}
            </>
          )}
        </div>
      </PageBody>

      <CreateGroupSheet open={panel === 'create'} onClose={close} />
      <JoinCodeSheet open={panel === 'join'} onClose={close} />
      <AccountSheet open={panel === 'account'} onClose={close} />
    </>
  );
}

function SummaryTile({ label, amount, tone }: { label: string; amount: number; tone: 'ok' | 'bad' }) {
  const Icon = tone === 'ok' ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="min-w-0 rounded-[20px] bg-white p-4">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-7 place-items-center rounded-full ${tone === 'ok' ? 'bg-ok/12 text-ok-ink' : 'bg-bad/10 text-bad-ink'}`}
        >
          <Icon className="size-4" strokeWidth={2.5} />
        </span>
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
      </div>
      <p className="mt-2 truncate text-[20px] font-bold tracking-tight tabular-nums sm:text-[24px]">
        {formatMoney(amount)}
      </p>
    </div>
  );
}
