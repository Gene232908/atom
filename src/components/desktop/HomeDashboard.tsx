import { useMemo, useState } from 'react';
import { KeyRound, Plus, Search, WalletCards } from 'lucide-react';
import type { GroupItem } from '../../hooks/useAllItems';
import { navigate } from '../../hooks/useRoute';
import { formatMoney } from '../../lib/money';
import { firstName } from '../../lib/items';
import { daysUntil, remainingFor, rowStatus } from '../../lib/itemStatus';
import type { Transaction } from '../../lib/transactions';
import { TransactionRow } from '../transactions/TransactionRow';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Skeleton } from '../ui/Skeleton';
import { ItemTable, type TableRow } from './ItemTable';
import { Panel, Segmented, StatStrip, UnderlineTabs } from './Panel';

type Tab = 'lend' | 'owe';
type Status = 'all' | 'open' | 'done';

interface Props {
  uid: string;
  userName: string;
  tab: Tab;
  onTab: (tab: Tab) => void;
  lendingItems: GroupItem[];
  owingItems: GroupItem[];
  youOwe: number;
  owedToYou: number;
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpen: (item: GroupItem) => void;
  onPay: (item: GroupItem) => void;
  onNewItem: () => void;
  onJoin: () => void;
  transactions: Transaction[];
  onOpenTx: (tx: Transaction) => void;
  onViewAllTx: () => void;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const toRow = (it: GroupItem): TableRow => ({ item: it, group: it.group });

/** Personal dashboard for laptops and PCs. */
export function HomeDashboard(props: Props) {
  const { uid, tab, onTab, lendingItems, owingItems, youOwe, owedToYou, loading, error } = props;
  const [status, setStatus] = useState<Status>('all');
  const [query, setQuery] = useState('');

  const all = useMemo(() => [...lendingItems, ...owingItems], [lendingItems, owingItems]);

  const waiting = useMemo(
    () => lendingItems.reduce((n, it) => n + Object.values(it.shares || {}).filter((s) => s.status === 'claimed').length, 0),
    [lendingItems],
  );

  const myLeft = (it: GroupItem) => (it.group.ownerId === uid ? rowStatus(it, it.group.ownerId, uid).amount : remainingFor(it, uid));

  const upcoming = useMemo(
    () =>
      all
        .filter((it) => it.dueDate && !rowStatus(it, it.group.ownerId, uid).done && myLeft(it) > 0)
        .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
        .slice(0, 6),
    [all, uid],
  );
  const dueWeek = upcoming.filter((it) => (daysUntil(it.dueDate) ?? 99) <= 7);
  const dueWeekAmount = dueWeek.reduce((sum, it) => sum + myLeft(it), 0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (tab === 'lend' ? lendingItems : owingItems).filter((it) => {
      const st = rowStatus(it, it.group.ownerId, uid);
      if (status === 'open' && st.done) return false;
      if (status === 'done' && !st.done) return false;
      if (!q) return true;
      return [it.description, it.store, it.group.name].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [tab, lendingItems, owingItems, status, query, uid]);

  return (
    <main className="mx-auto w-full max-w-[1360px] px-8 py-8 2xl:px-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="mt-1 truncate text-[26px] font-semibold tracking-tight text-ink">
            {greeting()}, {firstName(props.userName)}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="white" className="ring-1 ring-black/[0.08]" icon={<KeyRound className="size-4" />} onClick={props.onJoin}>
            Join a card
          </Button>
          <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={props.onNewItem}>
            Add a card
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <StatStrip
          items={[
            { label: 'You owe', value: formatMoney(youOwe), hint: `${owingItems.length} ${owingItems.length === 1 ? 'item' : 'items'} to pay`, tone: youOwe > 0 ? 'bad' : 'muted', onClick: () => onTab('owe') },
            { label: 'To collect', value: formatMoney(owedToYou), hint: `${lendingItems.length} ${lendingItems.length === 1 ? 'item' : 'items'} you lent`, tone: owedToYou > 0 ? 'ok' : 'muted', onClick: () => onTab('lend') },
            { label: 'To confirm', value: String(waiting), hint: waiting ? 'Payments to check' : 'Nothing to check', tone: waiting ? 'warn' : 'muted' },
            { label: 'Due in 7 days', value: formatMoney(dueWeekAmount), hint: `${dueWeek.length} ${dueWeek.length === 1 ? 'item' : 'items'}`, tone: dueWeek.length ? 'accent' : 'muted' },
          ]}
        />
      </div>

      {error && <div className="mt-6"><ErrorBanner message={error} onRetry={props.onRetry} /></div>}

      <div className="mt-6 grid items-start gap-6 2xl:grid-cols-12">
        <Panel
          className="2xl:col-span-8"
          title="Transactions"
          subtitle={tab === 'lend' ? 'Items where people owe you' : 'Items you need to pay'}
          actions={
            <label className="flex h-9 w-60 items-center gap-2 rounded-lg bg-canvas px-3 ring-1 ring-black/[0.06] focus-within:ring-2 focus-within:ring-accent">
              <Search className="size-4 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items"
                className="w-full min-w-0 bg-transparent text-[13px] outline-none placeholder:text-muted"
                style={{ fontSize: 13 }}
              />
            </label>
          }
        >
          <div className="flex flex-wrap items-end justify-between gap-3 px-6">
            <UnderlineTabs
              value={tab}
              onChange={onTab}
              options={[
                { key: 'lend', label: 'You lend', count: lendingItems.length },
                { key: 'owe', label: 'You owe', count: owingItems.length },
              ]}
            />
            <div className="pb-2">
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { key: 'all', label: 'All' },
                { key: 'open', label: 'Unpaid' },
                { key: 'done', label: 'Paid' },
              ]}
            />
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 border-t border-hairline p-6">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <ItemTable
              rows={rows.map(toRow)}
              uid={uid}
              showList
              amountLabel={tab === 'lend' ? 'Still owed' : 'Your balance'}
              onOpen={(r) => props.onOpen(r.item as GroupItem)}
              onPay={(r) => props.onPay(r.item as GroupItem)}
              empty={
                <EmptyState
                  icon={<WalletCards className="size-7" />}
                  title={query || status !== 'all' ? 'No matching items' : tab === 'lend' ? 'No items yet' : "You don't owe anything"}
                  text={
                    query || status !== 'all'
                      ? 'Try another search or filter.'
                      : tab === 'lend'
                        ? 'Add a card or store installment and split it with people.'
                        : 'When a friend adds you to their list, your items show here.'
                  }
                />
              }
            />
          )}
        </Panel>

        <div className="grid items-start gap-6 lg:grid-cols-2 2xl:col-span-4 2xl:grid-cols-1">
          <Panel title="Coming up" subtitle="Next due dates" delay={80}>
            {upcoming.length === 0 ? (
              <p className="border-t border-hairline px-6 py-8 text-center text-[13px] text-muted">No upcoming due dates.</p>
            ) : (
              <ul className="divide-y divide-hairline border-t border-hairline">
                {upcoming.map((it) => {
                  const [, m, d] = (it.dueDate ?? '').split('-').map(Number);
                  const days = daysUntil(it.dueDate) ?? 0;
                  const month = new Date(2000, (m || 1) - 1, 1).toLocaleDateString('en-PH', { month: 'short' });
                  return (
                    <li key={`${it.group.id}-${it.id}`}>
                      <button type="button" onClick={() => props.onOpen(it)} className="flex w-full items-center gap-3 px-6 py-3 text-left transition hover:bg-canvas/70">
                        <span className={`w-12 shrink-0 text-[13px] font-medium tabular-nums ${days < 0 ? 'text-bad-ink' : days <= 3 ? 'text-warn-ink' : 'text-muted'}`}>
                          {month} {d}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">{it.description}</span>
                          <span className="block truncate text-[12px] text-muted">
                            {days < 0 ? `${-days} days late` : days === 0 ? 'Due today' : `In ${days} ${days === 1 ? 'day' : 'days'}`} · {it.group.ownerId === uid ? 'to collect' : 'to pay'}
                          </span>
                        </span>
                        <span className="shrink-0 text-[13px] font-medium text-ink tabular-nums">{formatMoney(myLeft(it))}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title="Recent transactions"
            subtitle="Latest confirmed payments"
            delay={110}
            actions={
              props.transactions.length > 0 && (
                <button type="button" onClick={props.onViewAllTx} className="text-[13px] font-semibold text-accent hover:underline">
                  View all
                </button>
              )
            }
          >
            {props.transactions.length === 0 ? (
              <p className="border-t border-hairline px-6 py-8 text-center text-[13px] text-muted">No payments yet.</p>
            ) : (
              <div className="divide-y divide-hairline border-t border-hairline">
                {props.transactions.slice(0, 4).map((tx) => (
                  <TransactionRow key={tx.key} tx={tx} roomy onClick={() => props.onOpenTx(tx)} />
                ))}
              </div>
            )}
          </Panel>

          <PeoplePanel tab={tab} uid={uid} lendingItems={lendingItems} owingItems={owingItems} />
        </div>
      </div>
    </main>
  );
}

/** Lend tab: who owes you. Owe tab: who you owe. */
function PeoplePanel({ tab, uid, lendingItems, owingItems }: { tab: Tab; uid: string; lendingItems: GroupItem[]; owingItems: GroupItem[] }) {
  const people = useMemo(() => {
    const map = new Map<string, { uid: string; name: string; photo: string; amount: number; groupId: string }>();
    const add = (pid: string, name: string, photo: string, amount: number, it: GroupItem) => {
      const p = map.get(pid) ?? { uid: pid, name, photo, amount: 0, groupId: it.group.id };
      p.amount += amount;
      map.set(pid, p);
    };
    if (tab === 'lend') {
      for (const it of lendingItems) {
        for (const pid of Object.keys(it.shares || {})) {
          if (pid === uid) continue;
          const left = remainingFor(it, pid);
          if (left > 0) add(pid, it.group.members[pid]?.name ?? it.shares[pid].name, it.group.members[pid]?.photo ?? '', left, it);
        }
      }
    } else {
      for (const it of owingItems) {
        const left = remainingFor(it, uid);
        const owner = it.group.members[it.group.ownerId];
        if (left > 0) add(it.group.ownerId, owner?.name ?? 'Lender', owner?.photo ?? '', left, it);
      }
    }
    return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [tab, uid, lendingItems, owingItems]);

  const max = people[0]?.amount || 1;

  return (
    <Panel title={tab === 'lend' ? 'People who owe you' : 'People you owe'} subtitle="Remaining balance" delay={140}>
      {people.length === 0 ? (
        <p className="border-t border-hairline px-6 py-8 text-center text-[13px] text-muted">{tab === 'lend' ? 'Nobody owes you right now.' : 'You are all paid up.'}</p>
      ) : (
        <ul className="divide-y divide-hairline border-t border-hairline">
          {people.map((p) => (
            <li key={p.uid}>
              <button type="button" onClick={() => navigate(`/g/${p.groupId}`)} className="flex w-full items-center gap-3 px-6 py-3 text-left transition hover:bg-canvas/70">
                <Avatar name={p.name} photo={p.photo} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">{p.name}</span>
                    <span className="shrink-0 text-[13px] font-medium text-ink tabular-nums">{formatMoney(p.amount)}</span>
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-fill">
                    <span className="block h-full rounded-full bg-accent/70" style={{ width: `${Math.max(6, (p.amount / max) * 100)}%` }} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
