import { useCallback, useMemo, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Plus,
  ReceiptText,
  Search,
  SlidersHorizontal,
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
import { HeroCard } from './HeroCard';
import { FilterBar } from './FilterBar';
import { ItemRow } from './ItemRow';
import { ItemSheet } from './ItemSheet';
import { ItemFormSheet } from './ItemFormSheet';
import { InviteSheet } from './InviteSheet';
import { SettingsSheet } from './SettingsSheet';
import { PaySheet } from './PaySheet';
import { PersonSheet } from './PersonSheet';
import { PeopleCarousel } from './PeopleCarousel';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  const visible = useMemo(() => {
    let list = items.filter((item) => matchesFilter(item, group.ownerId, safeFilter, focusUid));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (it) => it.description.toLowerCase().includes(q) || it.store.toLowerCase().includes(q),
      );
    }
    return list;
  }, [items, group.ownerId, safeFilter, focusUid, searchQuery]);

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

  return (
    <>
      <NavBar
        title={group.name}
        backLabel="Wallet"
        closeButton={true}
        onBack={() => navigate('/')}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search transactions"
              onClick={() => setSearchOpen((prev) => !prev)}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-hairline transition active:scale-90"
            >
              <Search className="size-4" />
            </button>
            {isOwner && (
              <button
                type="button"
                aria-label="Add transaction"
                onClick={() => setPanel({ kind: 'add' })}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition active:scale-90"
              >
                <Plus className="size-5" strokeWidth={2.5} />
              </button>
            )}
            <button
              type="button"
              aria-label="Card Settings"
              onClick={() => setPanel({ kind: 'settings' })}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-hairline transition active:scale-90"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        }
      />

      <PageBody className="max-w-xl pb-24">
        {/* Prominent Loan Card with Gyroscope Reflection */}
        <div className="pt-1 pb-6">
          <HeroCard
            group={group}
            items={items}
            uid={uid}
            onPay={() => setPanel({ kind: 'pay', id: null })}
          />
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="mb-4 animate-fade-in">
            <input
              type="search"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-[14px] bg-white px-4 text-[15px] text-ink placeholder-muted ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        {/* Waiting Confirmation Alert */}
        {isOwner && waitingCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setFocusUid(null);
              setFilter('waiting');
            }}
            className="mb-6 flex w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-sm ring-1 ring-hairline transition active:scale-[0.99]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warn/15 text-warn-ink">
              <Clock className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">
                {waitingCount} {waitingCount === 1 ? 'payment' : 'payments'} to confirm
              </span>
              <span className="block text-[13px] text-muted">
                Check your GCash or bank, then mark them paid.
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted/60" strokeWidth={2.5} />
          </button>
        )}

        {/* Latest Transactions Section (Apple Wallet Table Layout - Image 1) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[20px] font-bold tracking-tight text-ink sm:text-[22px]">
              Latest Transactions
            </h2>
            <span className="text-[13px] font-medium text-muted">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <FilterBar
            filter={safeFilter}
            counts={counts}
            showWaiting={isOwner}
            onChange={setFilter}
            personName={focusName}
            onClearPerson={() => setFocusUid(null)}
          />

          {/* Suppress transient error banner if the list was just created in the last 15 seconds */}
          {error && !(isOwner && Date.now() - group.createdAt < 15000) && (
            <ErrorBanner message={error} onRetry={retry} />
          )}

          {loading ? (
            <div className="flex justify-center py-16 text-muted">
              <Spinner className="size-7" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="size-7" />}
              title="No transactions yet"
              text={
                isOwner
                  ? 'Tap + at the top or Add item below to record what someone owes.'
                  : `${ownerName} has not added any transactions to this list yet.`
              }
              action={
                isOwner && (
                  <Button icon={<Plus className="size-4" />} onClick={() => setPanel({ kind: 'add' })}>
                    Add transaction
                  </Button>
                )
              }
            />
          ) : visible.length === 0 ? (
            <p className="rounded-[20px] bg-white px-4 py-10 text-center text-[14px] text-muted">
              No transactions match this filter.
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
        </section>

        {/* People / Members */}
        {people.length > 1 && (
          <section className="mt-8">
            <div className="flex items-center justify-between px-1 mb-2.5">
              <h3 className="text-[17px] font-semibold text-ink">People</h3>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setPanel({ kind: 'invite' })}
                  className="text-[13px] font-semibold text-accent hover:underline"
                >
                  + Invite
                </button>
              )}
            </div>
            <PeopleCarousel
              people={people}
              uid={uid}
              isOwner={isOwner}
              onOpen={(personUid) => setPanel({ kind: 'person', uid: personUid })}
              onInvite={() => setPanel({ kind: 'invite' })}
            />
          </section>
        )}
      </PageBody>

      {/* Floating Action Button for Owner */}
      {isOwner && (
        <button
          type="button"
          aria-label="Add item"
          onClick={() => setPanel({ kind: 'add' })}
          className="fixed right-5 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-30 grid size-14 place-items-center rounded-full bg-ink text-white shadow-[0_10px_30px_-6px_rgba(0,0,0,0.45)] transition active:scale-90"
        >
          <Plus className="size-7" strokeWidth={2.5} />
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
