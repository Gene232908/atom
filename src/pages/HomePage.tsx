import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Plus, SlidersHorizontal, UserPlus, WalletCards } from 'lucide-react';
import { useUser } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { useAllItems, type GroupItem } from '../hooks/useAllItems';
import { useSafeWrite, useToast } from '../hooks/useToast';
import { formatMoney } from '../lib/money';
import { firstName, sumOwed } from '../lib/items';
import type { Group, Item, ShareStatus } from '../lib/types';
import { createGroup } from '../services/groups';
import { confirmPayment, recordPayment, setShareStatus, undoPayment } from '../services/items';
import { NavBar, PageBody } from '../components/layout/AppHeader';
import { ItemCardsView } from '../components/home/ItemWalletCard';
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

type Panel = 'create' | 'join' | null;

const PREF_KEY = 'atom_default_home_tab';
const LAYOUT_KEY = 'atom_card_layout_mode';

function getStoredPref(): DefaultViewPref {
  try {
    const val = localStorage.getItem(PREF_KEY);
    if (val === 'lend' || val === 'owe' || val === 'auto') return val;
  } catch {
    // ignore
  }
  return 'auto';
}

function getStoredLayout(): CardLayoutMode {
  try {
    const val = localStorage.getItem(LAYOUT_KEY);
    if (val === 'stack' || val === 'single') return val;
  } catch {
    // ignore
  }
  return 'stack';
}

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
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
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

  // Compute live accurate remaining balances from items and confirmed payments
  const { youOwe, owedToYou } = useMemo(() => {
    if (items.length === 0 && groups.length > 0) {
      let owe = 0;
      let owed = 0;
      for (const g of groups) {
        if (g.ownerId === user.uid) owed += sumOwed(g.totals);
        else owe += g.totals[user.uid] ?? 0;
      }
      return { youOwe: owe, owedToYou: owed };
    }

    let owe = 0;
    let owed = 0;

    for (const item of items) {
      const isOwner = item.group.ownerId === user.uid;
      const payments = Array.isArray(item.payments) ? item.payments : [];

      if (isOwner) {
        // As a lender: calculate remaining balance that other members still owe
        for (const [pid, share] of Object.entries(item.shares || {})) {
          if (pid === user.uid || !share) continue;
          if (share.status === 'paid') continue;

          const confirmedFromPayments = payments
            .filter((p) => p && p.uid === pid && p.status === 'confirmed')
            .reduce((sum, p) => sum + (p.amountCents || 0), 0);
          const totalPaid = Math.max(share.paidCents || 0, confirmedFromPayments);
          const remaining = Math.max(0, item.splitCents - totalPaid);

          owed += remaining;
        }
      } else {
        // As a borrower: calculate remaining balance you personally still owe
        const myShare = item.shares ? item.shares[user.uid] : undefined;
        if (myShare && myShare.status !== 'paid') {
          const confirmedFromPayments = payments
            .filter((p) => p && p.uid === user.uid && p.status === 'confirmed')
            .reduce((sum, p) => sum + (p.amountCents || 0), 0);
          const totalPaid = Math.max(myShare.paidCents || 0, confirmedFromPayments);
          const remaining = Math.max(0, item.splitCents - totalPaid);

          owe += remaining;
        }
      }
    }

    return { youOwe: owe, owedToYou: owed };
  }, [items, groups, user.uid]);

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

  // Direct item addition flow
  const handleStartAddItem = async () => {
    const owned = groups.find((g) => g.ownerId === user.uid);
    if (owned) {
      setTargetGroupId(owned.id);
      setIsAddingItem(true);
    } else {
      try {
        const { id, saved } = createGroup(user, 'My Cards');
        setTargetGroupId(id);
        setIsAddingItem(true);
        await saved;
      } catch (err) {
        toast('Could not create card list: ' + String(err));
      }
    }
  };

  // Active target group for adding items
  const activeAddGroup = useMemo<Group | null>(() => {
    if (targetGroupId) {
      const found = groups.find((g) => g.id === targetGroupId);
      if (found) return found;
    }
    const owned = groups.find((g) => g.ownerId === user.uid);
    if (owned) return owned;
    if (!targetGroupId) return null;
    return {
      id: targetGroupId,
      name: 'My Cards',
      ownerId: user.uid,
      memberIds: [user.uid],
      members: {
        [user.uid]: {
          name: user.displayName || 'Me',
          email: user.email || '',
          photo: user.photoURL || '',
          joinedAt: Date.now(),
        },
      },
      inviteCode: '',
      paymentNote: '',
      hasQr: false,
      color: '',
      totals: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [targetGroupId, groups, user]);

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
    (item: Item, personUid: string, status: ShareStatus) => {
      const parent = items.find((it) => it.id === item.id)?.group || (item as GroupItem).group;
      if (!parent) return;
      const who = firstName(parent.members[personUid]?.name ?? item.shares[personUid]?.name ?? 'They');
      if (status === 'paid') {
        const pendingPayment = item.payments?.find((p) => p.uid === personUid && p.status === 'pending');
        const paymentId = pendingPayment?.id || `claim-${personUid}`;
        write(
          confirmPayment(parent.id, item, paymentId, personUid),
          `Payment for ${who} confirmed and recorded!`,
        );
      } else if (status === 'unpaid') {
        write(
          undoPayment(parent.id, item, personUid),
          `Reverted ${who} to unpaid`,
        );
      } else {
        write(setShareStatus(parent.id, item.id, personUid, status), `Status updated for ${who}`);
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
      if (refNumber || (amountCents && amountCents !== item.splitCents)) {
        const payAmount = amountCents ?? item.splitCents;
        const payerName = parent.members[user.uid]?.name ?? item.shares[user.uid]?.name ?? 'You';
        write(
          recordPayment(parent.id, item, {
            uid: user.uid,
            payerName,
            amountCents: payAmount,
            refNumber: refNumber || 'Manual',
            note: note || 'Cut-off payment',
            status: 'pending',
          }),
          `Payment of ${formatMoney(payAmount)} sent! ${ownerName} will confirm it.`,
        );
      } else {
        write(setShareStatus(parent.id, item.id, user.uid, 'claimed', refNumber), `Sent! ${ownerName} will confirm it.`);
      }
    }
    setPayingItemId(null);
  };

  const loading = groupsLoading || (groups.length > 0 && itemsLoading && items.length === 0);

  return (
    <>
      <NavBar
        title="Wallet"
        right={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <IconButton label="Join a list" onClick={() => setPanel('join')}>
              <UserPlus className="size-[18px]" strokeWidth={2.2} />
            </IconButton>
            <IconButton label="New item" dark onClick={handleStartAddItem}>
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
                <div className="inline-flex items-center rounded-full bg-[#e5e5ea] p-1 ring-1 ring-black/[0.04]">
                  <button
                    type="button"
                    onClick={() => setTab('lend')}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
                      tab === 'lend'
                        ? 'bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.08)]'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span>You lend</span>
                    {lendingItems.length > 0 && (
                      <span
                        className={`grid min-w-[18px] h-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ${
                          tab === 'lend' ? 'bg-ink text-white' : 'bg-black/10 text-muted'
                        }`}
                      >
                        {lendingItems.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('owe')}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition active:scale-95 ${
                      tab === 'owe'
                        ? 'bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.08)]'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <span>You owe</span>
                    {owingItems.length > 0 && (
                      <span
                        className={`grid min-w-[18px] h-[18px] place-items-center rounded-full px-1 text-[10px] font-bold ${
                          tab === 'owe' ? 'bg-ink text-white' : 'bg-black/10 text-muted'
                        }`}
                      >
                        {owingItems.length}
                      </span>
                    )}
                  </button>
                </div>

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

              {error && <ErrorBanner message={error} onRetry={retry} />}

              {/* Cards Display */}
              {tab === 'lend' ? (
                lendingItems.length > 0 ? (
                  <ItemCardsView
                    items={lendingItems}
                    uid={user.uid}
                    mode={cardLayout}
                    onOpen={(it) => setViewingItemId(it.id)}
                  />
                ) : (
                  <EmptyState
                    icon={<WalletCards className="size-7" />}
                    title="No cards added yet"
                    text="Add your credit card or store installment (e.g. UnionBank, Atome, Shopee) and split with members."
                    action={
                      <Button
                        size="sm"
                        icon={<Plus className="size-4" strokeWidth={2.5} />}
                        onClick={handleStartAddItem}
                      >
                        New item
                      </Button>
                    }
                  />
                )
              ) : owingItems.length > 0 ? (
                <ItemCardsView
                  items={owingItems}
                  uid={user.uid}
                  mode={cardLayout}
                  onOpen={(it) => setViewingItemId(it.id)}
                />
              ) : (
                <EmptyState
                  icon={<WalletCards className="size-7" />}
                  title="You don't owe anything right now"
                  text="When someone lends you money or splits an item or installment with you, tap Join to enter their code."
                  action={
                    <Button
                      size="sm"
                      variant="white"
                      icon={<UserPlus className="size-4" />}
                      onClick={() => setPanel('join')}
                    >
                      Join a list
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        )}
      </PageBody>

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

      {/* Add New Item Sheet */}
      {isAddingItem && activeAddGroup && (
        <ItemFormSheet
          open={isAddingItem}
          onClose={() => setIsAddingItem(false)}
          group={activeAddGroup}
          item={null}
          onInvite={() => setInviteGroupId(activeAddGroup.id)}
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

function SummaryTile({
  label,
  amount,
  tone,
  sublabel,
}: {
  label: string;
  amount: number;
  tone: 'ok' | 'bad';
  sublabel?: string;
}) {
  const Icon = tone === 'ok' ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="min-w-0 rounded-[18px] sm:rounded-[20px] bg-white p-3 sm:p-4 shadow-sm ring-1 ring-hairline/80">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span
            className={`grid size-6 sm:size-7 shrink-0 place-items-center rounded-full ${
              tone === 'ok' ? 'bg-ok/12 text-ok-ink' : 'bg-bad/10 text-bad-ink'
            }`}
          >
            <Icon className="size-3.5 sm:size-4" strokeWidth={2.5} />
          </span>
          <p className="truncate text-[12px] sm:text-[13px] font-semibold text-muted">{label}</p>
        </div>
        {sublabel && (
          <span className="shrink-0 text-[9.5px] sm:text-[10px] font-medium text-muted/70 lowercase">
            {sublabel}
          </span>
        )}
      </div>
      <p className="mt-1.5 sm:mt-2 truncate text-[18px] sm:text-[22px] font-bold tracking-tight text-ink tabular-nums">
        {formatMoney(amount)}
      </p>
    </div>
  );
}
