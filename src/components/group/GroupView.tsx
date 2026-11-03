import { useCallback, useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Plus,
  QrCode,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';
import { useItems } from '../../hooks/useItems';
import { useSafeWrite } from '../../hooks/useToast';
import { useTotalsSync } from '../../hooks/useTotalsSync';
import { navigate } from '../../hooks/useRoute';
import { claimAll, setShareStatus } from '../../services/items';
import { firstName, matchesFilter, peopleSummary, type ItemFilter } from '../../lib/items';
import type { Group, Item, ShareStatus } from '../../lib/types';
import { NavBar, PageBody } from '../layout/AppHeader';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { SectionLabel } from '../ui/Group';
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
  const isOwner = group.ownerId === uid;
  const { items, loading, fromServer, error, retry } = useItems(group.id, isOwner);
  const write = useSafeWrite();
  const [filter, setFilter] = useState<ItemFilter>('all');
  const [focusUid, setFocusUid] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const close = useCallback(() => setPanel(null), []);

  useTotalsSync(group, items, isOwner && fromServer && !error);

  const people = useMemo(() => peopleSummary(group, items), [group, items]);

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
  const myUnpaidTotal = myUnpaid.reduce((sum, it) => sum + it.splitCents, 0);
  const waitingCount = useMemo(
    () => items.reduce((n, it) => n + Object.values(it.shares).filter((s) => s.status === 'claimed').length, 0),
    [items],
  );

  const ownerName = firstName(group.members[group.ownerId]?.name ?? 'The lender');

  const onSetStatus = useCallback(
    (item: Item, personUid: string, status: ShareStatus) => {
      const who = firstName(group.members[personUid]?.name ?? item.shares[personUid]?.name ?? 'They');
      const message =
        status === 'paid'
          ? `Marked ${who} as paid`
          : status === 'claimed'
            ? `Sent! ${ownerName} will confirm it.`
            : 'Changed back to not paid';
      write(setShareStatus(group.id, item.id, personUid, status), message);
    },
    [group.id, group.members, ownerName, write],
  );

  const onPaid = (item: Item | null) => {
    if (item) write(setShareStatus(group.id, item.id, uid, 'claimed'), `Sent! ${ownerName} will confirm it.`);
    else write(claimAll(group.id, items, uid), `Sent! ${ownerName} will confirm your payments.`);
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
      <NavBar
        title={group.name}
        backLabel="Wallet"
        onBack={() => navigate('/')}
        right={
          isOwner && (
            <>
              <IconButton label="Invite people" onClick={() => setPanel({ kind: 'invite' })}>
                <UserPlus className="size-[18px]" />
              </IconButton>
              <IconButton label="List settings" onClick={() => setPanel({ kind: 'settings' })}>
                <Settings className="size-[18px]" />
              </IconButton>
            </>
          )
        }
      />

      <PageBody>
        <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Left Column (Sticky card, quick actions, people) */}
          <div className="space-y-6 lg:sticky lg:top-20 lg:col-span-5">
            <HeroCard group={group} items={items} uid={uid} onPay={() => setPanel({ kind: 'pay', id: null })} />

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
          <div className="mt-6 space-y-6 lg:col-span-7 lg:mt-0">
            {/* Suppress transient error banner if the list was just created in the last 15 seconds */}
            {error && !(isOwner && Date.now() - group.createdAt < 15000) && (
              <ErrorBanner message={error} onRetry={retry} />
            )}

            {!isOwner && !loading && <MyCards items={items} uid={uid} onPay={payItem} onOpen={openItem} />}

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
                <div className="flex justify-center py-16 text-muted">
                  <Spinner className="size-7" />
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  icon={<ReceiptText className="size-7" />}
                  title="No items yet"
                  text={
                    isOwner
                      ? 'Tap Add item to list what people owe you. Everyone in the list will see it.'
                      : `${ownerName} has not added any items yet. They will show here right away.`
                  }
                  action={
                    isOwner && (
                      <Button icon={<Plus className="size-4" />} onClick={() => setPanel({ kind: 'add' })}>
                        Add item
                      </Button>
                    )
                  }
                />
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

      {/* Floating Action Button for Owner on Mobile */}
      {isOwner && (
        <button
          type="button"
          aria-label="Add item"
          onClick={() => setPanel({ kind: 'add' })}
          className="fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-ink text-white shadow-[0_10px_30px_-6px_rgba(0,0,0,0.45)] transition active:scale-90 sm:right-6 lg:hidden"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
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
      <ItemSheet
        item={viewing}
        group={group}
        uid={uid}
        onClose={close}
        onEdit={(item) => setPanel({ kind: 'edit', id: item.id })}
        onPay={payItem}
        onSetStatus={onSetStatus}
      />
      <PaySheet
        open={panel?.kind === 'pay'}
        onClose={close}
        group={group}
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
    </>
  );
}
