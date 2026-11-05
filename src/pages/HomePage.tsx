import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, History, MoreHorizontal, Plus, UserPlus, WalletCards, X } from 'lucide-react';
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
import { CardActionsSheet } from '../components/home/CardActionsSheet';
import { JoinCodeSheet } from '../components/home/JoinCodeSheet';
import { ProfileMenu } from '../components/home/ProfileMenu';
import { AppIconSheet } from '../components/home/AppIconSheet';
import { HistorySheet } from '../components/home/HistorySheet';
import { DefaultViewSheet, type CardLayoutMode, type DefaultViewPref } from '../components/home/DefaultViewSheet';
import { DueRemindersSheet } from '../components/home/DueRemindersSheet';
import {
  evaluateDueReminders,
  checkAndDispatchDueReminders,
  checkAndDispatchFriendRequestNotification,
  checkAndDispatchCardInviteNotification,
  ensurePushSubscribed,
  subscribeToPush,
  isPushSupported,
} from '../lib/notifications';
import { ItemSheet } from '../components/group/ItemSheet';
import { ItemFormSheet } from '../components/group/ItemFormSheet';
import { PaySheet } from '../components/group/PaySheet';
import { InviteSheet } from '../components/group/InviteSheet';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { HomeSkeleton } from '../components/ui/Skeleton';
import { SummaryTile } from '../components/home/SummaryTile';
import { LendOweToggle, type Tab } from '../components/home/LendOweToggle';
import { HomeDashboard } from '../components/desktop/HomeDashboard';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { LAYOUT_KEY, PREF_KEY, getStoredLayout, getStoredPref } from '../lib/prefs';
import { buildTransactions } from '../lib/transactions';
import { RecentTransactions } from '../components/transactions/RecentTransactions';
import { TransactionsScreen } from '../components/transactions/TransactionsScreen';
import { TransactionDetail } from '../components/transactions/TransactionDetail';
import { CreateLoanSheet } from '../components/loan/CreateLoanSheet';
import { LoanWalletCard } from '../components/loan/LoanWalletCard';
import { LoanDetailSheet } from '../components/loan/LoanDetailSheet';
import { computeLoanStats } from '../lib/loanUtils';
import type { Group } from '../lib/types';
import { FriendsSheet } from '../components/home/FriendsSheet';
import { useFriends } from '../hooks/useFriends';
import { acceptGroupInvite, declineGroupInvite } from '../services/groups';

type Panel = 'create' | 'join' | 'create_loan' | 'friends' | null;


export function HomePage() {
  const user = useUser();
  const toast = useToast();
  const write = useSafeWrite();
  const { groups, loading: groupsLoading, error, retry } = useGroups();
  const { items, loading: itemsLoading } = useAllItems(groups);
  const { requestsCount: friendRequestsCount, incomingRequests } = useFriends();

  const [panel, setPanel] = useState<Panel>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [appIconOpen, setAppIconOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Card the person pressed and held (shows Edit / Remove)
  const [heldId, setHeldId] = useState<string | null>(null);
  const [txListOpen, setTxListOpen] = useState(false);
  const [txKey, setTxKey] = useState<string | null>(null);
  const [defaultViewOpen, setDefaultViewOpen] = useState(false);
  const [pref, setPref] = useState<DefaultViewPref>(getStoredPref);
  const [cardLayout, setCardLayout] = useState<CardLayoutMode>(getStoredLayout);
  const [tab, setTab] = useState<Tab>('lend');
  const [hasResolvedDefault, setHasResolvedDefault] = useState(false);

  // Modal sheet states
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [payingItemId, setPayingItemId] = useState<string | null>(null);
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [viewingLoan, setViewingLoan] = useState<{ group: Group; item: Item } | null>(null);

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

  // All personal loans
  const loanItems = useMemo(
    () => items.filter((it) => it.isPersonalLoan || it.group.groupType === 'loan'),
    [items],
  );

  // Active (ongoing) personal loans: completed loans transfer to History
  const activeLoanItems = useMemo(
    () => loanItems.filter((it) => !computeLoanStats(it).isFullyPaid),
    [loanItems],
  );

  const completedLoanItems = useMemo(
    () => loanItems.filter((it) => computeLoanStats(it).isFullyPaid),
    [loanItems],
  );

  const lendingItems = useMemo(
    () => items.filter((it) => it.group.ownerId === user.uid && !it.isPersonalLoan && it.group.groupType !== 'loan'),
    [items, user.uid],
  );

  const owingItems = useMemo(
    () =>
      items.filter(
        (it) =>
          it.group.ownerId !== user.uid &&
          !it.isPersonalLoan &&
          it.group.groupType !== 'loan' &&
          it.shares &&
          it.shares[user.uid] &&
          it.group.members[user.uid]?.status !== 'pending',
      ),
    [items, user.uid],
  );

  // Card balances come from live items, so a partial payment shows the real amount left right away.
  const liveGroups = useMemo(() => {
    const byGroup = new Map<string, Item[]>();
    for (const it of items) byGroup.set(it.group.id, [...(byGroup.get(it.group.id) ?? []), it]);
    return groups.map((g) => (byGroup.has(g.id) ? { ...g, totals: computeTotals(byGroup.get(g.id)!, g.ownerId) } : g));
  }, [groups, items]);

  const isLoanGroup = useCallback(
    (g: Group) => {
      if (g.groupType === 'loan') return true;
      return items.some((it) => it.group.id === g.id && (it.isPersonalLoan || (it as any).group?.groupType === 'loan'));
    },
    [items],
  );

  // Pending card invitations sent to you by friends that you haven't accepted yet
  const pendingCardInvites = useMemo(
    () => liveGroups.filter((g) => g.ownerId !== user.uid && !isLoanGroup(g) && g.members[user.uid]?.status === 'pending'),
    [liveGroups, user.uid, isLoanGroup],
  );

  const lendingGroups = useMemo(
    () => liveGroups.filter((g) => g.ownerId === user.uid && !isLoanGroup(g)),
    [liveGroups, user.uid, isLoanGroup],
  );
  const owingGroups = useMemo(
    () => liveGroups.filter((g) => g.ownerId !== user.uid && !isLoanGroup(g) && g.members[user.uid]?.status !== 'pending'),
    [liveGroups, user.uid, isLoanGroup],
  );
  const loanGroups = useMemo(
    () =>
      liveGroups.filter((g) => {
        if (!isLoanGroup(g) || g.ownerId !== user.uid) return false;
        const gItems = items.filter((it) => it.group.id === g.id);
        // Exclude empty deleted groups and fully paid completed loans (moved to History)
        return gItems.length > 0 && gItems.some((it) => !computeLoanStats(it).isFullyPaid);
      }),
    [liveGroups, user.uid, isLoanGroup, items],
  );

  // Total remaining balance and paid amount across active personal loans
  const { loanRemainingTotal, loanPaidTotal } = useMemo(() => {
    let remaining = 0;
    let paid = 0;
    for (const it of activeLoanItems) {
      const stats = computeLoanStats(it);
      remaining += stats.remainingCents;
      paid += stats.totalPaidCents;
    }
    return { loanRemainingTotal: remaining, loanPaidTotal: paid };
  }, [activeLoanItems]);

  const activeLoanItem = useMemo(() => {
    if (!viewingLoan) return null;
    const freshItem = items.find((it) => it.id === viewingLoan.item.id);
    const freshGroup = groups.find((g) => g.id === viewingLoan.group.id);
    if (!freshItem || !freshGroup) return null;
    return { group: freshGroup, item: freshItem };
  }, [viewingLoan, items, groups]);

  // Live remaining balances, counting partial and confirmed payments
  const { youOwe, owedToYou } = useMemo(() => computeBalances(items, groups, user.uid), [items, groups, user.uid]);

  // Confirmed payments received and sent, newest first
  const transactions = useMemo(() => buildTransactions(items, user.uid), [items, user.uid]);
  const activeTx = useMemo(() => transactions.find((t) => t.key === txKey) ?? null, [transactions, txKey]);

  // Due date reminders for personal loans & peer debts
  const [remindersOpen, setRemindersOpen] = useState(false);
  const reminders = useMemo(
    () => evaluateDueReminders(items, groups, user.uid),
    [items, groups, user.uid],
  );
  const urgentReminders = useMemo(
    () => reminders.filter((r) => r.urgency === 'today' || r.urgency === 'overdue'),
    [reminders],
  );
  const hasUrgentReminder = urgentReminders.length > 0;

  // Background and on-open system notification check
  useEffect(() => {
    if (items.length > 0 && groups.length > 0) {
      checkAndDispatchDueReminders(items, groups, user.uid).catch((err) => {
        console.warn('Notification check failed:', err);
      });
    }
  }, [items, groups, user.uid]);

  // Friend request push notification dispatch
  useEffect(() => {
    if (incomingRequests && incomingRequests.length > 0) {
      checkAndDispatchFriendRequestNotification(incomingRequests).catch((err) => {
        console.warn('Friend request notification failed:', err);
      });
    }
  }, [incomingRequests]);

  // Card invitation push notification dispatch
  useEffect(() => {
    if (pendingCardInvites && pendingCardInvites.length > 0) {
      checkAndDispatchCardInviteNotification(pendingCardInvites).catch((err) => {
        console.warn('Card invitation notification failed:', err);
      });
    }
  }, [pendingCardInvites]);

  // Auto-sync Web Push token so the phone can receive background push when locked
  useEffect(() => {
    if (user && user.uid && isPushSupported()) {
      ensurePushSubscribed(user.uid).catch((err) => {
        console.warn('Auto ensurePushSubscribed failed:', err);
      });
    }
  }, [user]);

  // Prompt banner state for enabling phone notifications if not yet granted
  const [pushPermDismissed, setPushPermDismissed] = useState(() => {
    try {
      return localStorage.getItem('dismissed_push_perm_prompt') === 'true';
    } catch {
      return false;
    }
  });

  const shouldShowPushPrompt =
    !pushPermDismissed &&
    isPushSupported() &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'default';

  const handleSelectReminder = (targetGroup: Group, targetItem: Item) => {
    setRemindersOpen(false);
    if (targetItem.isPersonalLoan || targetGroup.groupType === 'loan') {
      setTab('loans');
      setViewingLoan({ group: targetGroup, item: targetItem });
    } else if (targetGroup.ownerId === user.uid) {
      setTab('lend');
      setViewingItemId(targetItem.id);
    } else {
      setTab('owe');
      setPayingItemId(targetItem.id);
    }
  };

  // Automatically determine the initial tab on open/login
  useEffect(() => {
    if (hasResolvedDefault) return;

    if (pref === 'loans') {
      setTab('loans');
      setHasResolvedDefault(true);
    } else if (pref === 'lend') {
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
      } else if (activeLoanItems.length > 0) {
        setTab('loans');
      } else {
        setTab('lend');
      }
      setHasResolvedDefault(true);
    }
  }, [groupsLoading, items.length, lendingItems.length, owingItems.length, activeLoanItems.length, pref, hasResolvedDefault]);

  const onSelectPref = (newPref: DefaultViewPref) => {
    setPref(newPref);
    try {
      localStorage.setItem(PREF_KEY, newPref);
    } catch {
      // ignore
    }

    if (newPref === 'loans') setTab('loans');
    else if (newPref === 'lend') setTab('lend');
    else if (newPref === 'owe') setTab('owe');
    else {
      if (lendingItems.length > 0) setTab('lend');
      else if (owingItems.length > 0) setTab('owe');
      else if (activeLoanItems.length > 0) setTab('loans');
      else setTab('lend');
    }

    toast(
      newPref === 'auto'
        ? 'Default view set to Auto (Smart).'
        : `Default view set to ${newPref === 'loans' ? 'My Loans' : newPref === 'lend' ? 'You lend' : 'You owe'}.`,
    );
  };

  // Reactive items for modals
  const viewingItem = useMemo(
    () => (viewingItemId ? items.find((i) => i.id === viewingItemId) ?? null : null),
    [viewingItemId, items],
  );

  // If an item opened via transaction is a personal loan, forward it to LoanDetailSheet
  useEffect(() => {
    if (viewingItemId) {
      const it = items.find((i) => i.id === viewingItemId);
      if (it && (it.isPersonalLoan || it.group.groupType === 'loan')) {
        setViewingLoan({ group: it.group, item: it });
        setViewingItemId(null);
      }
    }
  }, [viewingItemId, items]);

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
          loanItems={activeLoanItems}
          youOwe={youOwe}
          owedToYou={owedToYou}
          loanRemainingTotal={loanRemainingTotal}
          loanPaidTotal={loanPaidTotal}
          loading={loading}
          error={error}
          onRetry={retry}
          onOpen={(it) => {
            if (it.isPersonalLoan || it.group.groupType === 'loan') {
              setViewingLoan({ group: it.group, item: it });
            } else {
              setViewingItemId(it.id);
            }
          }}
          onPay={(it) => {
            if (it.isPersonalLoan || it.group.groupType === 'loan') {
              setViewingLoan({ group: it.group, item: it });
            } else {
              setPayingItemId(it.id);
            }
          }}
          onNewItem={() => setPanel(tab === 'loans' ? 'create_loan' : 'create')}
          onJoin={() => setPanel('join')}
          transactions={transactions}
          onOpenTx={(tx) => setTxKey(tx.key)}
          onViewAllTx={() => setTxListOpen(true)}
          onOpenReminders={() => setRemindersOpen(true)}
          remindersCount={reminders.length}
        />
      ) : (
        <>
      <NavBar
        title="Wallet"
        right={
          <div className="flex items-center gap-2">
            {/* 1. Circular Plus Button (Image 2 style) */}
            <button
              type="button"
              onClick={() => setPanel(tab === 'loans' ? 'create_loan' : 'create')}
              aria-label={tab === 'loans' ? 'Add a personal loan' : 'Add a card'}
              title={tab === 'loans' ? 'Add a personal loan' : 'Add a card'}
              className="relative grid size-9 shrink-0 place-items-center rounded-full liquid-rim bg-white/55 text-ink shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-xl backdrop-saturate-150 transition hover:text-accent active:scale-90"
            >
              <Plus className="size-4.5" strokeWidth={2.4} />
            </button>

            {/* 2. Elongated Pill Capsule with Avatar and Three Dots ••• (Image 2 style) */}
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="More options & profile"
              title="More options & profile"
              className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-full pr-2.5 pl-1.5 liquid-rim bg-white/55 text-ink shadow-[0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-xl backdrop-saturate-150 transition hover:bg-white/75 active:scale-95"
            >
              <Avatar name={name} photo={user.photoURL ?? ''} size="xs" ring="subtle" />
              <MoreHorizontal className="size-4 text-ink/75" strokeWidth={2.3} />

              {/* Notification / Alert Badge on Pill Capsule */}
              {friendRequestsCount > 0 ? (
                <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bad px-1 text-[10px] font-extrabold text-white shadow-xs animate-pulse">
                  +{friendRequestsCount}
                </span>
              ) : reminders.length > 0 ? (
                <span
                  className={`pointer-events-none absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white shadow-xs ${
                    hasUrgentReminder ? 'bg-bad animate-pulse' : 'bg-amber-500'
                  }`}
                >
                  {reminders.length}
                </span>
              ) : null}
            </button>
          </div>
        }
      />

      <ProfileMenu
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onOpenFriends={() => setPanel('friends')}
        friendRequestsCount={friendRequestsCount}
        onOpenReminders={() => setRemindersOpen(true)}
        remindersCount={reminders.length}
        hasUrgentReminder={hasUrgentReminder}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setDefaultViewOpen(true)}
        onOpenAppIcon={() => setAppIconOpen(true)}
      />

      <PageBody>
        {loading ? (
          <HomeSkeleton />
        ) : (
          <div className="animate-fade-in lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 pt-1 sm:pt-2">
            {/* Left Column on Desktop / Top Section on Mobile */}
            <div className="lg:sticky lg:top-20 lg:col-span-5 xl:col-span-4">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3.5">
                {tab === 'loans' ? (
                  <>
                    <SummaryTile label="Remaining loan" amount={loanRemainingTotal} tone="bad" sublabel="balance" />
                    <SummaryTile label="Paid so far" amount={loanPaidTotal} tone="ok" sublabel="progress" />
                  </>
                ) : (
                  <>
                    <SummaryTile label="You owe" amount={youOwe} tone="bad" sublabel="remaining" />
                    <SummaryTile label="To collect" amount={owedToYou} tone="ok" sublabel="remaining" />
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Cards & Toggle Switch */}
            <div className="mt-5 space-y-4 lg:col-span-7 xl:col-span-8 lg:mt-0">
              {/* Top Bar: Tabs Switch */}
              <div className="flex items-center justify-between gap-3">
                <LendOweToggle
                  tab={tab}
                  onChange={setTab}
                  lendCount={lendingGroups.length}
                  oweCount={owingGroups.length}
                  loansCount={loanGroups.length}
                />
              </div>

              {/* Phone Alert Activation Banner for lock-screen push */}
              {shouldShowPushPrompt && (
                <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/45 p-3.5 ring-1 ring-white/80 ring-inset shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_0_0_0.5px_rgba(0,0,0,0.06)] backdrop-blur-xl backdrop-saturate-150">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/10 text-accent ring-1 ring-white/70 ring-inset">
                      <Bell className="size-4" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">Receive phone alerts</p>
                      <p className="text-[11.5px] text-muted truncate">
                        Payments, friend requests and invites, even when your phone is locked.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={async () => {
                        const ok = await subscribeToPush(user.uid);
                        if (ok) {
                          toast('Phone alerts activated! You will receive notifications on your lock screen.');
                          setPushPermDismissed(true);
                        } else {
                          toast('Notification permission was not granted.');
                        }
                      }}
                    >
                      Enable
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setPushPermDismissed(true);
                        try {
                          localStorage.setItem('dismissed_push_perm_prompt', 'true');
                        } catch {}
                      }}
                      className="grid size-7 place-items-center rounded-full text-muted hover:text-ink hover:bg-fill transition"
                      title="Dismiss"
                      aria-label="Dismiss"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Actionable Due Date Reminder Alert Banner */}
              {reminders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRemindersOpen(true)}
                  className={`flex w-full items-center justify-between gap-3 rounded-[18px] p-3 text-left transition hover:opacity-95 active:scale-[0.99] select-none ${
                    hasUrgentReminder
                      ? 'bg-rose-50/95 text-rose-950 ring-1 ring-rose-200 shadow-xs'
                      : 'bg-amber-50/95 text-amber-950 ring-1 ring-amber-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full text-white shadow-xs ${
                        hasUrgentReminder ? 'bg-bad animate-pulse' : 'bg-amber-500'
                      }`}
                    >
                      <Bell className="size-3.5" strokeWidth={2.5} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold truncate">
                        {hasUrgentReminder
                          ? `${urgentReminders.length} Bill${urgentReminders.length > 1 ? 's' : ''} Due Today or Overdue`
                          : `${reminders.length} Bill${reminders.length > 1 ? 's' : ''} Due in 1–2 Days`}
                      </p>
                      <p className="text-[11px] opacity-80 truncate">
                        Tap to review payment schedule & push alerts
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 opacity-60" />
                </button>
              )}

              {error && <ErrorBanner message={error} onRetry={retry} />}

              {/* My cards: each list is one card */}
              {tab === 'loans' ? (
                activeLoanItems.length > 0 ? (
                  <div className="space-y-3.5">
                    {activeLoanItems.map((loanIt, idx) => {
                      const parentGroup = groups.find((g) => g.id === loanIt.group.id) || loanIt.group;
                      return (
                        <LoanWalletCard
                          key={loanIt.id}
                          group={parentGroup}
                          item={loanIt}
                          index={idx}
                          onOpen={(g, it) => setViewingLoan({ group: g, item: it })}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={<WalletCards className="size-7" />}
                    title={completedLoanItems.length > 0 ? 'No active personal loans' : 'No personal loans yet'}
                    text={
                      completedLoanItems.length > 0
                        ? 'All of your personal loans are fully paid! You can review them anytime under your Profile > History.'
                        : 'Add a loan for your motorcycle (e.g. PCX 160 under Sumisho), phone, or gadgets to track monthly progress, cut-off dates, and payments.'
                    }
                    action={
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button size="sm" icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={() => setPanel('create_loan')}>
                          Add a personal loan
                        </Button>
                        {completedLoanItems.length > 0 && (
                          <Button size="sm" variant="white" icon={<History className="size-4" />} onClick={() => setHistoryOpen(true)}>
                            View Completed History
                          </Button>
                        )}
                      </div>
                    }
                  />
                )
              ) : (
                <>
                  {/* Pending Card Invitations sent by friends */}
                  {tab === 'owe' && pendingCardInvites.length > 0 && (
                    <div className="space-y-3 mb-4 animate-fade-in">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11.5px] font-semibold text-muted uppercase tracking-wider">
                          Card Invitations ({pendingCardInvites.length})
                        </span>
                        <span className="text-[11px] text-muted">Accept to activate pre-split debts</span>
                      </div>

                      {pendingCardInvites.map((card) => {
                        const lenderName = card.members[card.ownerId]?.name || 'A friend';
                        const cardItems = items.filter((it) => it.group.id === card.id && it.shares?.[user.uid]);
                        const pendingTotalCents = cardItems.reduce((sum, it) => {
                          const share = it.shares[user.uid];
                          return sum + (share?.paidCents ? Math.max(0, it.splitCents - share.paidCents) : it.splitCents);
                        }, 0);

                        return (
                          <div key={card.id} className="rounded-[20px] bg-white p-4 ring-1 ring-hairline shadow-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wider">
                                  Card Invitation
                                </span>
                                <h4 className="mt-1 truncate text-[16px] font-bold text-ink">{card.name}</h4>
                                <p className="text-[12px] text-muted mt-0.5">
                                  {lenderName} invited you to this card.
                                </p>
                                {pendingTotalCents > 0 ? (
                                  <p className="text-[13px] font-semibold text-bad mt-1">
                                    {formatMoney(pendingTotalCents)} pre-split bill waiting
                                  </p>
                                ) : (
                                  <p className="text-[11.5px] text-muted italic mt-1">
                                    No items added yet
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    write(
                                      acceptGroupInvite(card.id, user.uid, user.displayName || name || 'Your friend'),
                                      `Joined "${card.name}"! Debts are now active.`,
                                    );
                                  }}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted hover:text-bad"
                                  onClick={() => {
                                    write(declineGroupInvite(card.id, user.uid), `Declined invite to "${card.name}".`);
                                  }}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {(tab === 'lend' ? lendingGroups : owingGroups).length > 0 ? (
                    <WalletCardsView groups={tab === 'lend' ? lendingGroups : owingGroups} uid={user.uid} mode={cardLayout} onHold={(g) => setHeldId(g.id)} items={items} />
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
                  ) : pendingCardInvites.length === 0 ? (
                    <EmptyState
                      icon={<WalletCards className="size-7" />}
                      title="You don't owe anything right now"
                      text="When a friend adds you to their card, it shows here."
                      action={
                        <Button size="sm" variant="white" icon={<UserPlus className="size-4" />} onClick={() => setPanel('friends')}>
                          Add friends
                        </Button>
                      }
                    />
                  ) : null}
                </>
              )}

              {groups.length > 0 && (
                <RecentTransactions
                  transactions={transactions}
                  onOpen={(tx) => setTxKey(tx.key)}
                  onViewAll={() => setTxListOpen(true)}
                />
              )}
            </div>
          </div>
        )}
      </PageBody>
        </>
      )}

      {/* All transactions, then one transaction on top of it */}
      {txListOpen && (
        <TransactionsScreen transactions={transactions} onClose={() => setTxListOpen(false)} onOpen={(tx) => setTxKey(tx.key)} />
      )}
      {activeTx && (
        <TransactionDetail
          tx={activeTx}
          uid={user.uid}
          onClose={() => setTxKey(null)}
          onOpenItem={() => setViewingItemId(activeTx.item.id)}
        />
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

      <CardActionsSheet group={groups.find((g) => g.id === heldId) ?? null} uid={user.uid} onClose={() => setHeldId(null)} />
      <CreateGroupSheet open={panel === 'create'} onClose={closePanel} />
      <CreateLoanSheet open={panel === 'create_loan'} onClose={closePanel} />
      <JoinCodeSheet open={panel === 'join'} onClose={closePanel} />
      <FriendsSheet open={panel === 'friends'} onClose={closePanel} onOpenJoinCode={() => setPanel('join')} />
      {activeLoanItem && (
        <LoanDetailSheet
          open={Boolean(activeLoanItem)}
          onClose={() => setViewingLoan(null)}
          group={activeLoanItem.group}
          item={activeLoanItem.item}
        />
      )}
      <DefaultViewSheet
        open={defaultViewOpen}
        onClose={() => setDefaultViewOpen(false)}
        preference={pref}
        onSelect={onSelectPref}
        layoutMode={cardLayout}
        onSelectLayoutMode={onSelectLayoutMode}
      />
      <DueRemindersSheet
        open={remindersOpen}
        onClose={() => setRemindersOpen(false)}
        reminders={reminders}
        userId={user.uid}
        onSelectReminder={handleSelectReminder}
      />
      <AppIconSheet
        open={appIconOpen}
        onClose={() => setAppIconOpen(false)}
      />
      <HistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        groups={groups}
        items={items}
        uid={user.uid}
        onOpenLoan={(g, it) => setViewingLoan({ group: g, item: it })}
        onOpenItem={(it: GroupItem) => {
          if (it.isPersonalLoan || it.group.groupType === 'loan') {
            setViewingLoan({ group: it.group, item: it });
          } else {
            setViewingItemId(it.id);
          }
        }}
      />
    </>
  );
}
