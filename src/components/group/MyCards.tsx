import { useMemo } from 'react';
import type { Group, Item, ShareStatus } from '../../lib/types';
import { SectionLabel } from '../ui/Group';
import { Carousel } from './Carousel';
import { DebtCard } from './DebtCard';

interface Props {
  items: Item[];
  group: Group;
  uid: string;
  onPay: (item: Item) => void;
  onOpen: (item: Item) => void;
}

const ORDER: Record<ShareStatus, number> = { unpaid: 0, claimed: 1, paid: 2 };

/** Your debts as swipeable ATM cards on phones, a grid on tablets and laptops. */
export function MyCards({ items, group, uid, onPay, onOpen }: Props) {
  const mine = useMemo(
    () =>
      items
        .filter((it) => it.shares[uid])
        .sort((a, b) => {
          const byStatus = ORDER[a.shares[uid].status] - ORDER[b.shares[uid].status];
          if (byStatus) return byStatus;
          const da = a.dueDate ?? '9999';
          const db = b.dueDate ?? '9999';
          return da.localeCompare(db) || b.createdAt - a.createdAt;
        }),
    [items, uid],
  );

  if (mine.length === 0) return null;
  const unpaid = mine.filter((it) => it.shares[uid].status === 'unpaid').length;

  return (
    <section>
      <SectionLabel
        right={
          <span className="shrink-0 pb-0.5 text-[13px] font-medium text-muted">
            {unpaid > 0 ? `${unpaid} to pay` : 'All paid'}
            {mine.length > 1 && <span className="md:hidden"> · Swipe →</span>}
          </span>
        }
      >
        Your cards
      </SectionLabel>
      {mine.length === 1 ? (
        <div className="w-full">
          <DebtCard item={mine[0]} group={group} personUid={uid} onPay={onPay} onOpen={onOpen} />
        </div>
      ) : (
        <Carousel
          dots
          slideClass="w-[90%] sm:w-full max-w-[480px] md:w-auto md:max-w-none"
          wideClass="md:mx-0 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-4 md:overflow-visible md:px-0"
        >
          {mine.map((item) => (
            <DebtCard key={item.id} item={item} group={group} personUid={uid} onPay={onPay} onOpen={onOpen} />
          ))}
        </Carousel>
      )}
    </section>
  );
}
