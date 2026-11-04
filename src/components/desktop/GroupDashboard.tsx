import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Copy,
  LogOut,
  Plus,
  QrCode,
  ReceiptText,
  Settings,
  UserPlus,
} from 'lucide-react';
import { navigate, inviteLink } from '../../hooks/useRoute';
import { copyText } from '../../lib/clipboard';
import { groupGradient } from '../../lib/cardTheme';
import { formatMoney } from '../../lib/money';
import { firstName, type ItemFilter } from '../../lib/items';
import { remainingFor, shortDue } from '../../lib/itemStatus';
import type { Group, Item, PersonSummary } from '../../lib/types';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Skeleton } from '../ui/Skeleton';
import { FilterBar } from '../group/FilterBar';
import { ItemTable } from './ItemTable';
import { Panel, StatTile } from './Panel';

export interface GroupDashboardProps {
  group: Group;
  uid: string;
  items: Item[];
  visible: Item[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  people: PersonSummary[];
  filter: ItemFilter;
  counts: Record<ItemFilter, number>;
  onFilter: (f: ItemFilter) => void;
  focusUid: string | null;
  focusName: string | null;
  onClearFocus: () => void;
  waitingCount: number;
  myUnpaidTotal: number;
  onOpenItem: (item: Item) => void;
  onPayItem: (item: Item) => void;
  onPayAll: () => void;
  onAdd: () => void;
  onInvite: () => void;
  onSettings: () => void;
  onLeave: () => void;
  onOpenPerson: (uid: string) => void;
  onShowWaiting: () => void;
}

/** One list, laid out as a dashboard for laptops and PCs. */
export function GroupDashboard(p: GroupDashboardProps) {
  const { group, uid, items, people } = p;
  const isOwner = group.ownerId === uid;
  const owner = group.members[group.ownerId];
  const ownerName = firstName(owner?.name ?? 'The lender');
  const members = people.filter((x) => !x.isOwner);
  const me = people.find((x) => x.uid === uid);

  const nextDue = useMemo(() => {
    const open = items
      .filter((it) => it.dueDate && (isOwner ? members.some((m) => remainingFor(it, m.uid) > 0) : remainingFor(it, uid) > 0))
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
    return open[0] ?? null;
  }, [items, isOwner, members, uid]);
  const nextDueInfo = nextDue ? shortDue(nextDue.dueDate, false) : null;

  const owed = members.reduce((s, m) => s + m.owes, 0);
  const collected = members.reduce((s, m) => s + m.paid, 0);
  const doneCount = items.filter((it) => {
    const others = Object.entries(it.shares || {}).filter(([id]) => id !== group.ownerId);
    return others.length > 0 && others.every(([, s]) => s.status === 'paid');
  }).length;

  return (
    <main className="mx-auto w-full max-w-[1360px] px-8 py-8 2xl:px-12">
      <button type="button" onClick={() => navigate('/')} className="text-[13px] font-medium text-muted transition hover:text-ink">
        Overview <span className="px-1">/</span> <span className="text-ink">{group.name}</span>
      </button>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="size-12 shrink-0 rounded-2xl shadow-sm" style={{ backgroundImage: groupGradient(group) }} />
          <div className="min-w-0">
            <h1 className="truncate text-[28px] leading-tight font-bold tracking-tight">{group.name}</h1>
            <p className="truncate text-[13px] text-muted">
              {isOwner ? 'You lend' : `${owner?.name ?? 'Lender'} lends`} · {members.length} {members.length === 1 ? 'person' : 'people'} · {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isOwner ? (
            <>
              <Button variant="white" className="ring-1 ring-hairline" icon={<Settings className="size-4" />} onClick={p.onSettings}>
                Settings
              </Button>
              <Button variant="white" className="ring-1 ring-hairline" icon={<UserPlus className="size-4" />} onClick={p.onInvite}>
                Invite
              </Button>
              <Button icon={<Plus className="size-4" strokeWidth={2.5} />} onClick={p.onAdd}>
                Add item
              </Button>
            </>
          ) : (
            <>
              <Button variant="white" className="ring-1 ring-hairline" icon={<LogOut className="size-4" />} onClick={p.onLeave}>
                Leave list
              </Button>
              {p.myUnpaidTotal > 0 && <Button onClick={p.onPayAll}>Pay total {formatMoney(p.myUnpaidTotal)}</Button>}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {isOwner ? (
          <>
            <StatTile label="Still owed to you" value={formatMoney(owed)} hint={`From ${members.filter((m) => m.owes > 0).length} people`} tone="ok" icon={<ArrowDownLeft className="size-4" strokeWidth={2.5} />} />
            <StatTile label="Collected" value={formatMoney(collected)} hint="Confirmed payments" tone="accent" icon={<Check className="size-4" strokeWidth={2.5} />} />
            <StatTile label="To confirm" value={String(p.waitingCount)} hint={p.waitingCount ? 'Tap to review' : 'Nothing to check'} tone="warn" icon={<Clock className="size-4" />} onClick={p.waitingCount ? p.onShowWaiting : undefined} />
            <StatTile label="Items fully paid" value={`${doneCount} / ${items.length}`} hint={nextDueInfo ? `Next: ${nextDueInfo.text}` : 'No due dates'} tone="muted" icon={<ReceiptText className="size-4" />} />
          </>
        ) : (
          <>
            <StatTile label={`You owe ${ownerName}`} value={formatMoney(me?.owes ?? 0)} hint="Remaining balance" tone="bad" icon={<ArrowUpRight className="size-4" strokeWidth={2.5} />} />
            <StatTile label="You paid" value={formatMoney(me?.paid ?? 0)} hint="Confirmed by the lender" tone="ok" icon={<Check className="size-4" strokeWidth={2.5} />} />
            <StatTile label="Waiting" value={formatMoney(me?.waiting ?? 0)} hint="Sent, not yet confirmed" tone="warn" icon={<Clock className="size-4" />} />
            <StatTile label="Next due" value={nextDue ? formatMoney(remainingFor(nextDue, uid)) : '—'} hint={nextDueInfo ? `${nextDueInfo.text} · ${nextDue?.description}` : 'No due dates'} tone="accent" icon={<CalendarClock className="size-4" />} />
          </>
        )}
      </div>

      {p.error && <div className="mt-6"><ErrorBanner message={p.error} onRetry={p.onRetry} /></div>}

      <div className="mt-6 grid items-start gap-6 2xl:grid-cols-12">
        <Panel className="2xl:col-span-8" title="Items" subtitle={isOwner ? 'Everything people owe you in this list' : 'Your share is shown for each item'}>
          {items.length > 0 && (
            <div className="border-b border-hairline px-5 py-3">
              <div className="max-w-md">
                <FilterBar filter={p.filter} counts={p.counts} showWaiting={isOwner} onChange={p.onFilter} personName={p.focusName} onClearPerson={p.onClearFocus} />
              </div>
            </div>
          )}
          {p.loading ? (
            <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <ItemTable
              rows={p.visible.map((item) => ({ item, group }))}
              uid={uid}
              focusUid={p.focusUid}
              amountLabel={isOwner && !p.focusUid ? 'Still owed' : 'Balance'}
              onOpen={(r) => p.onOpenItem(r.item)}
              onPay={(r) => p.onPayItem(r.item)}
              empty={
                <EmptyState
                  icon={<ReceiptText className="size-7" />}
                  title={items.length ? 'Nothing here' : 'No items yet'}
                  text={items.length ? 'Try another filter.' : isOwner ? 'Click Add item to list what people owe you.' : `${ownerName} has not added items yet.`}
                  action={!items.length && isOwner ? <Button size="sm" icon={<Plus className="size-4" />} onClick={p.onAdd}>Add item</Button> : undefined}
                />
              }
            />
          )}
        </Panel>

        <div className="grid items-start gap-6 lg:grid-cols-2 2xl:col-span-4 2xl:grid-cols-1">
          <Panel title="People" subtitle={`${people.length} in this list`} actions={isOwner ? <Button size="sm" variant="secondary" icon={<UserPlus className="size-3.5" />} onClick={p.onInvite}>Invite</Button> : undefined}>
            <ul className="divide-y divide-hairline">
              {people.map((person) => {
                const total = person.owes + person.paid;
                const pct = total > 0 ? Math.round((person.paid / total) * 100) : 100;
                return (
                  <li key={person.uid}>
                    <button type="button" onClick={() => p.onOpenPerson(person.uid)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-canvas/70">
                      <Avatar name={person.name} photo={person.photo} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold">
                            {person.uid === uid ? 'You' : person.name}
                            {person.isOwner && <span className="ml-1.5 text-[11px] font-medium text-warn-ink">Lender</span>}
                          </span>
                          {!person.isOwner && (
                            <span className={`shrink-0 text-[13px] font-semibold tabular-nums ${person.owes > 0 ? 'text-bad-ink' : 'text-ok-ink'}`}>
                              {person.owes > 0 ? formatMoney(person.owes) : 'All paid'}
                            </span>
                          )}
                        </span>
                        {!person.isOwner && (
                          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-fill">
                            <span className="block h-full rounded-full bg-ok" style={{ width: `${pct}%` }} />
                          </span>
                        )}
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted/50" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <PaymentPanel group={group} isOwner={isOwner} owed={p.myUnpaidTotal} onPay={p.onPayAll} onEdit={p.onSettings} />
        </div>
      </div>
    </main>
  );
}

function PaymentPanel({ group, isOwner, owed, onPay, onEdit }: { group: Group; isOwner: boolean; owed: number; onPay: () => void; onEdit: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(inviteLink(group.inviteCode))) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Panel title="Payment details" actions={isOwner ? <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button> : undefined}>
      <div className="space-y-4 px-5 py-4">
        {group.paymentNote ? (
          <p className="text-[14px] font-medium whitespace-pre-wrap text-ink">{group.paymentNote}</p>
        ) : (
          <p className="text-[13px] text-muted">{isOwner ? 'Add your GCash, Maya or bank details so people know where to pay.' : 'The lender has not added payment details yet.'}</p>
        )}
        <p className="flex items-center gap-2 text-[13px] text-muted">
          <QrCode className="size-4" /> {group.hasQr ? 'Payment QR is available' : 'No payment QR yet'}
        </p>
        {!isOwner && owed > 0 && (
          <Button full onClick={onPay}>
            Pay now
          </Button>
        )}
        {isOwner && group.inviteCode && (
          <div className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Invite code</p>
              <p className="font-mono text-[17px] font-semibold tracking-[0.18em]">{group.inviteCode}</p>
            </div>
            <Button size="sm" variant="white" className="ring-1 ring-hairline" icon={copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} onClick={copy}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
