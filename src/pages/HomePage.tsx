import { useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, KeyRound, Plus, SlidersHorizontal, WalletCards } from 'lucide-react';
import { useUser } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { useToast } from '../hooks/useToast';
import { formatMoney } from '../lib/money';
import { firstName, sumOwed } from '../lib/items';
import { LargeTitle, NavBar, PageBody } from '../components/layout/AppHeader';
import { WalletStack } from '../components/home/GroupWalletCard';
import { CreateGroupSheet } from '../components/home/CreateGroupSheet';
import { JoinCodeSheet } from '../components/home/JoinCodeSheet';
import { AccountSheet } from '../components/home/AccountSheet';
import { DefaultViewSheet, type DefaultViewPref } from '../components/home/DefaultViewSheet';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Spinner } from '../components/ui/Spinner';

type Panel = 'create' | 'join' | 'account' | null;

const PREF_KEY = 'atom_default_home_tab';

function getStoredPref(): DefaultViewPref {
  try {
    const val = localStorage.getItem(PREF_KEY);
    if (val === 'lend' || val === 'owe' || val === 'auto') return val;
  } catch {
    // ignore
  }
  return 'auto';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const user = useUser();
  const toast = useToast();
  const { groups, loading, error, retry } = useGroups();
  const [panel, setPanel] = useState<Panel>(null);
  const [defaultViewOpen, setDefaultViewOpen] = useState(false);
  const [pref, setPref] = useState<DefaultViewPref>(getStoredPref);
  const [tab, setTab] = useState<'lend' | 'owe'>('lend');
  const [hasResolvedDefault, setHasResolvedDefault] = useState(false);

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

  // Automatically determine the initial tab on open/login:
  // - If user has an explicit preference ('lend' or 'owe'), use it.
  // - If 'auto':
  //     1. If you have "you lend", show "You lend" first.
  //     2. If both exist, show "You lend" first.
  //     3. If no "you lend" but you have "you owe", show "You owe" first.
  useEffect(() => {
    if (hasResolvedDefault) return;

    if (pref === 'lend') {
      setTab('lend');
      setHasResolvedDefault(true);
    } else if (pref === 'owe') {
      setTab('owe');
      setHasResolvedDefault(true);
    } else if (!loading || groups.length > 0) {
      if (lending.length > 0) {
        setTab('lend');
      } else if (owing.length > 0) {
        setTab('owe');
      } else {
        setTab('lend');
      }
      setHasResolvedDefault(true);
    }
  }, [loading, groups.length, lending.length, owing.length, pref, hasResolvedDefault]);

  const onSelectPref = (newPref: DefaultViewPref) => {
    setPref(newPref);
    try {
      localStorage.setItem(PREF_KEY, newPref);
    } catch {
      // ignore
    }

    if (newPref === 'lend') setTab('lend');
    else if (newPref === 'owe') setTab('owe');
    else {
      if (lending.length > 0) setTab('lend');
      else if (owing.length > 0) setTab('owe');
      else setTab('lend');
    }

    toast(
      newPref === 'auto'
        ? 'Default view set to Auto (Smart).'
        : `Default view set to ${newPref === 'lend' ? 'You lend' : 'You owe'}.`,
    );
  };

  return (
    <>
      <NavBar
        title="Wallet"
        right={
          <>
            <IconButton label="New list" dark onClick={() => setPanel('create')}>
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
          <Button size="lg" icon={<Plus className="size-5" strokeWidth={2.5} />} onClick={() => setPanel('create')}>
            New list
          </Button>
          <Button size="lg" variant="white" icon={<KeyRound className="size-[18px]" />} onClick={() => setPanel('join')}>
            Join
          </Button>
        </div>

        <div className="mt-8 space-y-4">
          {/* Toggle Switch between You lend & You owe + Settings icon */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex flex-1 rounded-full bg-[#e5e5ea] p-1 ring-1 ring-black/[0.04]">
              <button
                type="button"
                onClick={() => setTab('lend')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[14px] font-semibold transition active:scale-95 ${
                  tab === 'lend'
                    ? 'bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <span>You lend</span>
                {lending.length > 0 && (
                  <span
                    className={`grid min-w-5 h-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${
                      tab === 'lend' ? 'bg-ink text-white' : 'bg-black/10 text-muted'
                    }`}
                  >
                    {lending.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTab('owe')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-[14px] font-semibold transition active:scale-95 ${
                  tab === 'owe'
                    ? 'bg-white text-ink shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <span>You owe</span>
                {owing.length > 0 && (
                  <span
                    className={`grid min-w-5 h-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${
                      tab === 'owe' ? 'bg-ink text-white' : 'bg-black/10 text-muted'
                    }`}
                  >
                    {owing.length}
                  </span>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setDefaultViewOpen(true)}
              title="Which tab to see first"
              aria-label="Default view settings"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-muted shadow-sm ring-1 ring-hairline transition hover:text-ink active:scale-90"
            >
              <SlidersHorizontal className="size-4" strokeWidth={2.2} />
            </button>
          </div>

          {error && <ErrorBanner message={error} onRetry={retry} />}

          {loading ? (
            <div className="flex justify-center py-16 text-muted">
              <Spinner className="size-7" />
            </div>
          ) : tab === 'lend' ? (
            lending.length > 0 ? (
              <WalletStack groups={lending} uid={user.uid} />
            ) : (
              <EmptyState
                icon={<WalletCards className="size-7" />}
                title="No lending lists yet"
                text="Create a list if people owe you money, or if you paid for shared orders."
                action={
                  <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setPanel('create')}>
                    New list
                  </Button>
                }
              />
            )
          ) : owing.length > 0 ? (
            <WalletStack groups={owing} uid={user.uid} />
          ) : (
            <EmptyState
              icon={<WalletCards className="size-7" />}
              title="You don't owe anyone right now"
              text="When someone lends you money or splits a bill with you, tap Join to enter their code."
              action={
                <Button variant="white" icon={<KeyRound className="size-4" />} onClick={() => setPanel('join')}>
                  Join a list
                </Button>
              }
            />
          )}
        </div>
      </PageBody>

      <CreateGroupSheet open={panel === 'create'} onClose={close} />
      <JoinCodeSheet open={panel === 'join'} onClose={close} />
      <AccountSheet open={panel === 'account'} onClose={close} />
      <DefaultViewSheet
        open={defaultViewOpen}
        onClose={() => setDefaultViewOpen(false)}
        preference={pref}
        onSelect={onSelectPref}
      />
    </>
  );
}

function SummaryTile({ label, amount, tone }: { label: string; amount: number; tone: 'ok' | 'bad' }) {
  const Icon = tone === 'ok' ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="min-w-0 rounded-[20px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-7 place-items-center rounded-full ${
            tone === 'ok' ? 'bg-ok/12 text-ok-ink' : 'bg-bad/10 text-bad-ink'
          }`}
        >
          <Icon className="size-4" strokeWidth={2.5} />
        </span>
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
      </div>
      <p className="mt-2 truncate text-[20px] font-bold tracking-tight text-ink tabular-nums sm:text-[24px]">
        {formatMoney(amount)}
      </p>
    </div>
  );
}
