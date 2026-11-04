import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, SlidersHorizontal, UserPlus, WalletCards } from 'lucide-react';
import { useUser } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { useAllItems, type GroupItem } from '../hooks/useAllItems';
import { useSafeWrite, useToast } from '../hooks/useToast';
import { formatMoney } from '../lib/money';
import { computeTotals, confirmedPaid, firstName } from '../lib/items';
import { computeBalances } from '../lib/balances';
import type { Item, ShareStatus } from '../lib/types';
import { confirmPayment, recordPayment, undoPayment } from '../services/items';
import { NavBar, PageBody } from '../components/layout/AppHeader';
import { WalletCardsView } from '../components/home/GroupWalletCard';
import { CreateGroupSheet } from '../components/home/CreateGroupSheet';
import { JoinCodeSheet } from '../components/home/JoinCodeSheet';
import { ProfileMenu } from '../components/home/ProfileMenu';
import { DefaultViewSheet, type CardLayoutMode, type DefaultViewPref } from '../components/home/DefaultViewSheet';
import { ItemSheet } from '../components/group/ItemSheet';
import { ItemFormSheet } from '../components/group/ItemFormSheet';
import { PaySheet } from '../components/group/PaySheet';
import { InviteSheet } from '../components/group/InviteSheet';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { HomeSkeleton } from '../components/ui/Skeleton';
import { SummaryTile } from '../components/home/SummaryTile';
import { LendOweToggle } from '../components/home/LendOweToggle';
import { MotionPrompt } from '../components/ui/MotionPrompt';
import { HomeDashboard } from '../components/desktop/HomeDashboard';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { LAYOUT_KEY, PREF_KEY, getStoredLayout, getStoredPref } from '../lib/prefs';

type Panel = 'create' | 'join' | null;


export function HomePage() {
  const user = useUser();
  const toast = useToast();
  const write = useSafeWrite();
  const { groups, loading: groupsLoading, error, retry } = useGroups();
  const { items, loading: itemsLoading } = useAllItems(groups);

  const [panel, setPanel] = useState<Panel>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [defaultViewOpen, setDefaultViewOpen] = useState(false);
  const [pref, setPref] = useState<DefaultViewPref>(getStoredPref);
  const [cardLayout, setCardLayout] = useState<CardLayoutMode>(getStoredLayout);
  const [tab, setTab] = useState<'lend' | 'owe'>('lend');
  const [hasResolvedDefault, setHasResolvedDefault] = useState(false);

  // Modal sheet states
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [payingItemId, setPayingItemId] = useState<string | null>(null);
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);

  const onSelectLayoutMode = (mode: CardLayoutMode) => {
    setCardLayout(mode);
    try {
      localStorage.setItem(LAYOUT_KEY, mode);
    } catch {
      // ignore
    }
    toast(
      mode === 'single'
        ? 'Card view set to 1 at a time (Swipe left/right).'
        : 'Card view set to All cards (Stacked).',
    );
  };

  const closePanel = () => setPanel(null);
  const name = user.displayName || 'there';

  // Lending vs Owing items
  const lendingItems = useMemo(
    () => items.filter((it) => it.group.ownerId === user.uid),
    [items, user.uid],
  );

  const owingItems = useMemo(
    () => items.filter((it) => it.group.ownerId !== user.uid && it.shares && it.shares[user.uid]),
    [items, user.uid],
  );

  // Card balances come from live items, so a partial payment shows the real amount left right away.
  const liveGroups = useMemo(() => {
    const byGroup = new Map<string, Item[]>();
    for (const it of items) byGroup.set(it.group.id, [...(byGroup.get(it.group.id) ?? []), it]);
    return groups.map((g) => (byGroup.has(g.id) ? { ...g, totals: computeTotals(byGroup.get(g.id)!, g.ownerId) } : g));
  }, [groups, items]);
  const lendingGroups = useMemo(() => liveGroups.filter((g) => g.ownerId === user.uid), [liveGroups, user.uid]);
  const owingGroups = useMemo(() => liveGroups.filter((g) => g.ownerId !== user.uid), [liveGroups, user.uid]);

  // Live remaining balances, counting partial and confirmed payments
  const { youOwe, owedToYou } = useMemo(() => computeBalances(items, groups, user.uid), [items, groups, user.uid]);

  // Automatically determine the initial tab on open/login
  useEffect(() => {
    if (hasResolvedDefault) return;

    if (pref === 'lend') {
      setTab('lend');
      setHasResolvedDefault(true);
    } else if (pref === 'owe') {
      setTab('owe');
      setHasResolvedDefault(true);
    } else if (!groupsLoading || items.length > 0) {
      if (lendingItems.length > 0) {
        setTab('lend');
      } else if (owingItems.length > 0) {
        setTab('owe');
      } else {
        setTab('lend');
      }
      setHasResolvedDefault(true);
    }
  }, [groupsLoading, items.length, lendingItems.length, owingItems.length, pref, hasResolvedDefault]);

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
      if (lendingItems.length > 0) setTab('lend');
      else if (owingItems.length > 0) setTab('owe');
      else setTab('lend');
    }

    toast(
      newPref === 'auto'
        ? 'Default view set to Auto (Smart).'
        : `Default view set to ${newPref === 'lend' ? 'You lend' : 'You owe'}.`,
    );
  };

  // Reactive items for modals
  const viewingItem = useMemo(
    () => (viewingItemId ? items.find((i) => i.id === viewingItemId) ?? null : null),
    [viewingItemId, items],
  );

  const editingItem = useMemo(
    () => (editingItemId ? items.find((i) => i.id === editingItemId) ?? null : null),
    [editingItemId, items],
  );

  const payingItem = useMemo(
    () => (payingItemId ? items.find((i) => i.id === payingItemId) ?? null : null),
    [payingItemId, items],
  );

  const activeInviteGroup = useMemo(
    () => (inviteGroupId ? groups.find((g) => g.id === inviteGroupId) ?? null : null),
    [inviteGroupId, groups],
  );

  // Payment confirmation & status handling
  const onSetStatus = useCallback(
    (item: Item, personUid: string, status: ShareStatus, amountCents?: number) => {
      const parent = items.find((it) => it.id === item.id)?.group || (item as GroupItem).group;
      if (!parent) return;
      const who = firstName(parent.members[personUid]?.name ?? item.shares[personUid]?.name ?? 'They');
      if (status === 'paid') {
        const pendingPayment = item.payments?.find((p) => p.uid === personUid && p.status === 'pending');
        const paymentId = pendingPayment?.id || `claim-${personUid}`;
        write(
          confirmPayment(parent.id, item, paymentId, personUid, amountCents),
          amountCents ? `Confirmed ${formatMoney(amountCents)} from ${who}` : `Payment for ${who} confirmed`,
        );
      } else if (status === 'unpaid') {
        write(
          undoPayment(parent.id, item, personUid),
          `Reverted ${who} to unpaid`,
        );
      }
    },
    [items, write],
  );

  // Payee submitting a payment
  const onPaid = (item: Item | null, amountCents?: number, refNumber?: string, note?: string) => {
    if (item) {
      const parent = items.find((it) => it.id === item.id)?.group || (item as GroupItem).group;
      if (!parent) return;
      const ownerName = firstName(parent.members[parent.ownerId]?.name ?? 'The lender');
      {
        // Always save how much was sent, so the lender confirms the right amount.
        const left = Math.max(0, item.splitCents - confirmedPaid(item, user.uid));
        const payAmount = amountCents && amountCents > 0 ? Math.min(amountCents, left) : left;
        const payerName = parent.members[user.uid]?.name ?? item.shares[user.uid]?.name ?? 'You';
        write(
          recordPayment(parent.id, item, {
            uid: user.uid,
            payerName,
            amountCents: payAmount,
            refNumber: refNumber || '',
            note: note || (payAmount < left ? 'Partial payment' : 'Full payment'),
            status: 'pending',
          }),
          `Payment of ${formatMoney(payAmount)} sent! ${ownerName} will confirm it.`,
        );
      }
    }
    setPayingItemId(null);
  };

  const loading = groupsLoading || (groups.length > 0 && itemsLoading && items.length === 0);
  const isDesktop = useIsDesktop();

  return (
    <>
      {isDesktop ? (
        <HomeDashboard
          uid={user.uid}
          userName={name}
          tab={tab}
          onTab={setTab}
          lendingItems={lendingItems}
          owingItems={owingItems}
          youOwe={youOwe}
          owedToYou={owedToYou}
          loading={loading}
          error={error}
          onRetry={retry}
          onOpen={(it) => setViewingItemId(it.id)}
          onPay={(it) => setPayingItemId(it.id)}
          onNewItem={() => setPanel('create')}
          onJoin={() => setPanel('join')}
        />
      ) : (
        <>
      <NavBar
        title="Wallet"
        right={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <IconButton label="Join a list" onClick={() => setPanel('join')}>
              <UserPlus className="size-[18px]" strokeWidth={2.2} />
            </IconButton>
            <IconButton label="Add a card" dark onClick={() => setPanel('create')}>
              <Plus className="size-5" strokeWidth={2.5} />
            </IconButton>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Your account"
              className="size-9 shrink-0 rounded-full ring-2 ring-hairline shadow-sm overflow-hidden transition active:scale-90 ml-0.5"
            >
              <Avatar name={name} photo={user.photoURL ?? ''} size="sm" />
            </button>
          </div>
        }
      />

      <ProfileMenu open={profileOpen} onClose={() => setProfileOpen(false)} />

      <PageBody>
        {loading ? (
          <HomeSkeleton />
        ) : (
          <div className="animate-fade-in lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 pt-1 sm:pt-2">
            {/* Left Column on Desktop / Top Section on Mobile */}
            <div className="lg:sticky lg:top-20 lg:col-span-5 xl:col-span-4">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3.5">
                <SummaryTile label="You owe" amount={youOwe} tone="bad" sublabel="remaining" />
                <SummaryTile label="To collect" amount={owedToYou} tone="ok" sublabel="remaining" />
              </div>
            </div>

            {/* Right Column: Cards & Toggle Switch */}
            <div className="mt-5 space-y-4 lg:col-span-7 xl:col-span-8 lg:mt-0">
              {/* Top Bar: Tabs + Settings */}
              <div className="flex items-center justify-between gap-3">
                <LendOweToggle
                  tab={tab}
                  onChange={setTab}
                  lendCount={lendingGroups.length}
                  oweCount={owingGroups.length}
                />

                <button
                  type="button"
                  onClick={() => setDefaultViewOpen(true)}
                  title="Display & default view settings"
                  aria-label="Default view settings"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-muted shadow-sm ring-1 ring-hairline transition hover:text-ink active:scale-90"
                >
                  <SlidersHorizontal className="size-4" strokeWidth={2.2} />
                </button>
              </div>

              <MotionPrompt />

              {error && <ErrorBanner message={error} onRetry={retry} />}

              {/* My cards: each list is one card */}
              {(tab === 'lend' ? lendingGroups : owingGroups).length > 0 ? (
                <WalletCardsView groups={tab === 'lend' ? lendingGroups : owingGroups} uid={user.uid} mode={cardLayout} />
              ) : tab === 'lend' ? (
                <EmptyState
                  icon={<WalletCards className="size-7" />}
                  title="No cards yet"
                  text="Add a card for each credit card or pay-later app you lend from, like BDO, Atome or SPayLater."
                  action={
                    <Button size="sm" icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setPanel('create')}>
                      Add a card
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<WalletCards className="size-7" />}
                  title="You don't owe anything right now"
                  text="When a friend adds you to their card, it shows here. Tap Join to enter their code."
                  action={
                    <Button size="sm" variant="white" icon={<UserPlus className="size-4" />} onClick={() => setPanel('join')}>
                      Join a card
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}
      </PageBody>
        </>
      )}

      {/* Item Details Sheet */}
      {viewingItem && (
        <ItemSheet
          item={viewingItem}
          group={viewingItem.group}
          uid={user.uid}
          onClose={() => setViewingItemId(null)}
          onEdit={(it) => {
            setEditingItemId(it.id);
            setViewingItemId(null);
          }}
          onPay={(it) => {
            setPayingItemId(it.id);
            setViewingItemId(null);
          }}
          onSetStatus={onSetStatus}
        />
      )}

      {/* Edit Item Sheet */}
      {editingItem && (
        <ItemFormSheet
          open={Boolean(editingItem)}
          onClose={() => setEditingItemId(null)}
          group={(editingItem as GroupItem).group}
          item={editingItem}
          onInvite={() => setInviteGroupId((editingItem as GroupItem).group.id)}
        />
      )}

      {/* Pay Sheet */}
      {payingItem && (
        <PaySheet
          open={Boolean(payingItem)}
          onClose={() => setPayingItemId(null)}
          group={(payingItem as GroupItem).group}
          uid={user.uid}
          item={payingItem}
          totalCents={
            payingItem.shares?.[user.uid]?.paidCents
              ? Math.max(0, payingItem.splitCents - payingItem.shares[user.uid].paidCents!)
              : payingItem.splitCents
          }
          unpaidCount={1}
          onPaid={onPaid}
        />
      )}

      {/* Invite Sheet */}
      {activeInviteGroup && (
        <InviteSheet
          open={Boolean(activeInviteGroup)}
          onClose={() => setInviteGroupId(null)}
          group={activeInviteGroup}
        />
      )}

      <CreateGroupSheet open={panel === 'create'} onClose={closePanel} />
      <JoinCodeSheet open={panel === 'join'} onClose={closePanel} />
      <DefaultViewSheet
        open={defaultViewOpen}
        onClose={() => setDefaultViewOpen(false)}
        preference={pref}
        onSelect={onSelectPref}
        layoutMode={cardLayout}
        onSelectLayoutMode={onSelectLayoutMode}
      />
    </>
  );
}
