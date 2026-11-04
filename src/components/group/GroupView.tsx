import { useCallback, useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  LogOut,
  Plus,
  QrCode,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';
import { useItems } from '../../hooks/useItems';
import { useUser } from '../../hooks/useAuth';
import { useSafeWrite, useToast } from '../../hooks/useToast';
import { useTotalsSync } from '../../hooks/useTotalsSync';
import { navigate } from '../../hooks/useRoute';
import { removeMember } from '../../services/groups';
import { claimAll, confirmPayment, recordPayment, undoPayment } from '../../services/items';
import { friendlyError } from '../../lib/errors';
import { formatMoney } from '../../lib/money';
import { confirmedPaid, firstName, matchesFilter, peopleSummary, type ItemFilter } from '../../lib/items';
import type { Group, Item, ShareStatus } from '../../lib/types';
import { NavBar, PageBody } from '../layout/AppHeader';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { Skeleton } from '../ui/Skeleton';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';
import { SectionLabel } from '../ui/Group';
import { ProfileMenu } from '../home/ProfileMenu';
import { HeroCard } from './HeroCard';
import { QuickActions } from './QuickActions';
import { PeopleCarousel } from './PeopleCarousel';
import { MyCards } from './MyCards';
import { FilterBar } from './FilterBar';
import { ItemRow } from './ItemRow';
import { ItemSheet } from './ItemSheet';
import { ItemFormSheet } from './ItemFormSheet';
import { InviteSheet } from './InviteSheet';
import { SettingsSheet } from './SettingsSheet';
import { PaySheet } from './PaySheet';
import { PersonSheet } from './PersonSheet';
import { OwnerBanners } from './OwnerBanners';
import { GroupDashboard } from '../desktop/GroupDashboard';
import { useIsDesktop } from '../../hooks/useIsDesktop';

type Panel =
  | { kind: 'add' }
  | { kind: 'edit'; id: string }
  | { kind: 'item'; id: string }
  | { kind: 'invite' }
  | { kind: 'settings' }
  | { kind: 'pay'; id: string | null }
  | { kind: 'person'; uid: string }
  | null;

const FILTERS: ItemFilter[] = ['all', 'unpaid', 'waiting', 'paid'];

export function GroupView({ group, uid }: { group: Group; uid: string }) {
  const user = useUser();
  const isOwner = group.ownerId === uid;
  const { items, loading, fromServer, error, retry } = useItems(group.id, isOwner);
  const write = useSafeWrite();
  const toast = useToast();
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [focusUid, setFocusUid] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const close = useCallback(() => setPanel(null), []);
  const isDesktop = useIsDesktop();

  useTotalsSync(group, items, isOwner && fromServer && !error);

  const people = useMemo(() => peopleSummary(group, items), [group, items]);
  const otherMembers = useMemo(() => people.filter((p) => !p.isOwner), [people]);

  const counts = useMemo(() => {
    const result: Record<ItemFilter, number> = { all: 0, unpaid: 0, waiting: 0, paid: 0 };
    for (const item of items) {
      for (const f of FILTERS) if (matchesFilter(item, group.ownerId, f, focusUid)) result[f] += 1;
    }
    return result;
  }, [items, group.ownerId, focusUid]);

  const safeFilter = !isOwner && filter === 'waiting' ? 'all' : filter;
  const visible = useMemo(
    () => items.filter((item) => matchesFilter(item, group.ownerId, safeFilter, focusUid)),
    [items, group.ownerId, safeFilter, focusUid],
  );

  const myUnpaid = useMemo(
    () => (isOwner ? [] : items.filter((it) => it.shares[uid]?.status === 'unpaid')),
    [items, uid, isOwner],
  );
  const myUnpaidTotal = myUnpaid.reduce((sum, it) => sum + Math.max(0, it.splitCents - confirmedPaid(it, uid)), 0);
  const waitingCount = useMemo(
    () => items.reduce((n, it) => n + Object.values(it.shares).filter((s) => s.status === 'claimed').length, 0),
    [items],
  );

  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'The lender');

  const onSetStatus = useCallback(
    (item: Item, personUid: string, status: ShareStatus, amountCents?: number) => {
      const who = firstName(group.members[personUid]?.name ?? item.shares[personUid]?.name ?? 'They');
      if (status === 'paid') {
        const pendingPayment = item.payments?.find((p) => p.uid === personUid && p.status === 'pending');
        const paymentId = pendingPayment?.id || `claim-${personUid}`;
        write(
          confirmPayment(group.id, item, paymentId, personUid, amountCents),
          amountCents ? `Confirmed ${formatMoney(amountCents)} from ${who}` : `Payment for ${who} confirmed`,
        );
      } else if (status === 'unpaid') {
        write(
          undoPayment(group.id, item, personUid),
          `Reverted ${who} to unpaid`,
        );
      }
    },
    [group.id, group.members, write],
  );

  const onPaid = (item: Item | null, amountCents?: number, refNumber?: string, note?: string) => {
    if (item) {
      {
        // Always save how much was sent, so the lender confirms the right amount.
        const left = Math.max(0, item.splitCents - confirmedPaid(item, uid));
        const payAmount = amountCents && amountCents > 0 ? Math.min(amountCents, left) : left;
        const payerName = group.members[uid]?.name ?? item.shares[uid]?.name ?? 'You';
        write(
          recordPayment(group.id, item, {
            uid,
            payerName,
            amountCents: payAmount,
            refNumber: refNumber || '',
            note: note || (payAmount < left ? 'Partial payment' : 'Full payment'),
            status: 'pending',
          }),
          `Payment of ${formatMoney(payAmount)} sent! ${ownerName} will confirm it.`,
        );
      }
    } else {
      write(claimAll(group.id, items, uid), `Sent! ${ownerName} will confirm your payments.`);
    }
    close();
  };

  const openItem = useCallback((item: Item) => setPanel({ kind: 'item', id: item.id }), []);
  const payItem = useCallback((item: Item) => setPanel({ kind: 'pay', id: item.id }), []);

  const showPerson = (personUid: string) => {
    setFocusUid(personUid);
    setFilter('all');
  };

  const find = (id: string) => items.find((i) => i.id === id) ?? null;
  const editing = panel?.kind === 'edit' ? find(panel.id) : null;
  const viewing = panel?.kind === 'item' ? find(panel.id) : null;
  const paying = panel?.kind === 'pay' && panel.id ? find(panel.id) : null;
  const personPanel = panel?.kind === 'person' ? (people.find((p) => p.uid === panel.uid) ?? null) : null;
  const focusName =
    focusUid === null ? null : focusUid === uid ? '' : (people.find((p) => p.uid === focusUid)?.name ?? 'this person');
  const onlyOwner = group.memberIds.length <= 1;

  const peopleSection = (
    <section>
      <SectionLabel>People</SectionLabel>
      <PeopleCarousel
        people={people}
        uid={uid}
        isOwner={isOwner}
        onOpen={(personUid) => setPanel({ kind: 'person', uid: personUid })}
        onInvite={() => setPanel({ kind: 'invite' })}
      />
    </section>
  );

  return (
    <>
      {isDesktop ? (
        <GroupDashboard
          group={group}
          uid={uid}
          items={items}
          visible={visible}
          loading={loading}
          error={error && !(isOwner && Date.now() - group.createdAt < 15000) ? error : ''}
          onRetry={retry}
          people={people}
          filter={safeFilter}
          counts={counts}
          onFilter={setFilter}
          focusUid={focusUid}
          focusName={focusName}
          onClearFocus={() => setFocusUid(null)}
          waitingCount={waitingCount}
          myUnpaidTotal={myUnpaidTotal}
          onOpenItem={openItem}
          onPayItem={payItem}
          onPayAll={() => setPanel({ kind: 'pay', id: null })}
          onAdd={() => setPanel({ kind: 'add' })}
          onInvite={() => setPanel({ kind: 'invite' })}
          onSettings={() => setPanel({ kind: 'settings' })}
          onLeave={() => setConfirmLeave(true)}
          onOpenPerson={(personUid) => setPanel({ kind: 'person', uid: personUid })}
          onShowWaiting={() => {
            setFocusUid(null);
            setFilter('waiting');
          }}
        />
      ) : (
        <>
      <NavBar
        title={group.name}
        backLabel="Wallet"
        onBack={() => navigate('/')}
        right={
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isOwner ? (
              <IconButton label="List settings" onClick={() => setPanel({ kind: 'settings' })}>
                <Settings className="size-[18px]" />
              </IconButton>
            ) : (
              <IconButton label="Remove from wallet" onClick={() => setConfirmLeave(true)}>
                <LogOut className="size-[18px]" />
              </IconButton>
            )}
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Your account"
              className="size-9 shrink-0 rounded-full ring-2 ring-hairline shadow-sm overflow-hidden transition active:scale-90 ml-0.5"
            >
              <Avatar name={user.displayName || user.email || 'You'} photo={user.photoURL ?? ''} size="sm" />
            </button>
          </div>
        }
      />

      <ProfileMenu open={profileOpen} onClose={() => setProfileOpen(false)} />

      <PageBody compactBottom={items.length === 0}>
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-12">
          {/* Left Column (Sticky card, quick actions, people) */}
          <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-20 lg:col-span-5 xl:col-span-4">
            <HeroCard group={group} items={items} uid={uid} onPay={() => setPanel({ kind: 'pay', id: null })} />

            {isOwner && (
              <OwnerBanners
                inviteCode={group.inviteCode}
                otherMembers={otherMembers}
                itemCount={items.length}
                waitingCount={waitingCount}
                onInvite={() => setPanel({ kind: 'invite' })}
                onSettings={() => setPanel({ kind: 'settings' })}
              />
            )}

            {isOwner && (
              <QuickActions
                actions={[
                  { label: 'Add item', icon: <Plus className="size-6" />, onClick: () => setPanel({ kind: 'add' }) },
                  {
                    label: 'Invite',
                    icon: <UserPlus className="size-[22px]" />,
                    onClick: () => setPanel({ kind: 'invite' }),
                    highlight: onlyOwner,
                  },
                  {
                    label: 'Pay info',
                    icon: <QrCode className="size-[22px]" />,
                    onClick: () => setPanel({ kind: 'settings' }),
                    highlight: !group.hasQr && !group.paymentNote,
                  },
                  {
                    label: 'Settings',
                    icon: <SlidersHorizontal className="size-[22px]" />,
                    onClick: () => setPanel({ kind: 'settings' }),
                  },
                ]}
              />
            )}

            {isOwner && waitingCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setFocusUid(null);
                  setFilter('waiting');
                }}
                className="flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-sm ring-1 ring-hairline transition active:scale-[0.99]"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn/15 text-warn-ink">
                  <Clock className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">
                    {waitingCount} {waitingCount === 1 ? 'payment' : 'payments'} to confirm
                  </span>
                  <span className="block text-[13px] text-muted">Check your GCash or bank, then mark them paid.</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted/60" strokeWidth={2.5} />
              </button>
            )}

            {isOwner ? peopleSection : <div className="hidden lg:block">{peopleSection}</div>}
          </div>

          {/* Right Column (Items list / Add transaction) */}
          <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 lg:col-span-7 lg:mt-0">
            {/* Suppress transient error banner if the list was just created in the last 15 seconds */}
            {error && !(isOwner && Date.now() - group.createdAt < 15000) && (
              <ErrorBanner message={error} onRetry={retry} />
            )}

            {!isOwner && !loading && <MyCards items={items} group={group} uid={uid} onPay={payItem} onOpen={openItem} />}

            <section>
              <SectionLabel
                right={
                  <span className="text-[13px] font-medium text-muted">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                }
              >
                {isOwner ? 'Items' : 'All items'}
              </SectionLabel>

              {loading ? (
                <div className="space-y-3">
                  <div className="rounded-[20px] bg-white p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <>
                  <div className="flex items-center justify-center gap-2 rounded-[18px] bg-white/80 py-3.5 px-4 text-center text-[13px] text-muted ring-1 ring-hairline sm:hidden">
                    <ReceiptText className="size-4 shrink-0 text-muted/70" />
                    <span>No items yet. Tap <strong>Add item</strong> above.</span>
                  </div>
                  <div className="hidden sm:block">
                    <EmptyState
                      icon={<ReceiptText className="size-7" />}
                      title="No items yet"
                      text={
                        isOwner
                          ? 'Tap Add item to list what people owe you. Everyone in the list will see it.'
                          : `${ownerName} has not added any items yet. They will show here right away.`
                      }
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <FilterBar
                    filter={safeFilter}
                    counts={counts}
                    showWaiting={isOwner}
                    onChange={setFilter}
                    personName={focusName}
                    onClearPerson={() => setFocusUid(null)}
                  />

                  {visible.length === 0 ? (
                    <p className="rounded-[20px] bg-white px-4 py-10 text-center text-[14px] text-muted">
                      Nothing here. Try another filter.
                    </p>
                  ) : (
                    <div className="overflow-hidden rounded-[20px] bg-white shadow-sm ring-1 ring-hairline">
                      <div className="divide-y divide-hairline">
                        {visible.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            group={group}
                            uid={uid}
                            focusUid={focusUid}
                            onOpen={openItem}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {!isOwner && <div className="lg:hidden">{peopleSection}</div>}
          </div>
        </div>
      </PageBody>
        </>
      )}

      {/* Sheets & Dialogs */}
      {isOwner && (
        <>
          <ItemFormSheet
            open={panel?.kind === 'add' || (panel?.kind === 'edit' && editing !== null)}
            onClose={close}
            group={group}
            item={editing}
            onInvite={() => setPanel({ kind: 'invite' })}
          />
          <InviteSheet open={panel?.kind === 'invite'} onClose={close} group={group} />
          <SettingsSheet open={panel?.kind === 'settings'} onClose={close} group={group} />
        </>
      )}
      {viewing && (
        <ItemSheet
          item={viewing}
          group={group}
          uid={uid}
          onClose={close}
          onEdit={(item) => setPanel({ kind: 'edit', id: item.id })}
          onPay={payItem}
          onSetStatus={onSetStatus}
        />
      )}
      <PaySheet
        open={panel?.kind === 'pay'}
        onClose={close}
        group={group}
        uid={uid}
        item={paying}
        totalCents={myUnpaidTotal}
        unpaidCount={myUnpaid.length}
        onPaid={onPaid}
      />
      <PersonSheet
        person={personPanel}
        group={group}
        items={items}
        uid={uid}
        onClose={close}
        onShowItems={showPerson}
      />
      <ConfirmSheet
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Remove this list from your wallet?"
        message={
          <>
            You will leave <span className="font-semibold text-ink">"{group.name}"</span> and it will be removed from your wallet. If you want to rejoin later, you will need the invite code again.
          </>
        }
        confirmText="Remove card"
        danger
        onConfirm={async () => {
          try {
            await removeMember(group.id, uid);
            toast('Removed list from your wallet');
            navigate('/', true);
          } catch (err) {
            toast(friendlyError(err), 'error');
          }
        }}
      />
    </>
  );
}
