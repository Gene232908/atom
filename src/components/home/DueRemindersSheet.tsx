import { useState } from 'react';
import {
  BellOff,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { formatMoney } from '../../lib/money';
import { formatDueDateReadable } from '../../lib/loanUtils';
import {
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  type DueReminder,
} from '../../lib/notifications';
import type { Group, Item } from '../../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  reminders: DueReminder[];
  userId: string;
  onSelectReminder: (group: Group, item: Item) => void;
}

export function DueRemindersSheet({
  open,
  onClose,
  reminders,
  userId,
  onSelectReminder,
}: Props) {
  const toast = useToast();
  const [enabling, setEnabling] = useState(false);
  const [permission, setPermission] = useState(getNotificationPermission);

  const supported = isPushSupported();

  const handleEnableNotifications = async () => {
    setEnabling(true);
    try {
      const success = await subscribeToPush(userId);
      setPermission(getNotificationPermission());
      if (success) {
        toast('Push notifications enabled successfully! 🔔');
      } else {
        toast('Could not enable notifications. Please check your browser permissions.');
      }
    } catch (err: any) {
      toast(err?.message || 'Error enabling notifications.');
    } finally {
      setEnabling(false);
    }
  };

  // Group reminders by category
  const overdueReminders = reminders.filter((r) => r.urgency === 'overdue');
  const todayReminders = reminders.filter((r) => r.urgency === 'today');
  const tomorrowReminders = reminders.filter((r) => r.urgency === 'tomorrow');
  const upcomingReminders = reminders.filter((r) => r.urgency === 'two_days');

  return (
    <Sheet open={open} onClose={onClose} title="Due Reminders">
      <div className="space-y-4">
        {/* Compact Online Status UI */}
        {permission === 'granted' ? (
          <div className="flex items-center justify-between rounded-[16px] bg-white px-3.5 py-2.5 shadow-xs ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="truncate text-[13px] font-bold text-ink">Push Alerts Active</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              Online ✓
            </span>
          </div>
        ) : supported ? (
          <div className="flex items-center justify-between gap-3 rounded-[16px] bg-white px-3.5 py-2.5 shadow-xs ring-1 ring-black/[0.06]">
            <div className="flex items-center gap-2 min-w-0">
              <BellOff className="size-4 shrink-0 text-amber-500" />
              <span className="truncate text-[13px] font-semibold text-ink">Push alerts off</span>
            </div>
            <Button
              size="sm"
              variant="primary"
              disabled={enabling}
              onClick={handleEnableNotifications}
            >
              {enabling ? 'Enabling...' : 'Turn on'}
            </Button>
          </div>
        ) : null}

        {/* Reminders List */}
        {reminders.length === 0 ? (
          <div className="rounded-[20px] bg-white p-6 text-center ring-1 ring-black/[0.06]">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 className="size-6" />
            </div>
            <p className="text-[16px] font-bold text-ink">All caught up!</p>
            <p className="mt-1 text-[13px] text-muted max-w-xs mx-auto">
              No bills or collections due today or in the next 2 days. When a due date approaches, you'll be reminded here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Due Today */}
            {todayReminders.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-bold uppercase tracking-wider text-bad">
                  Due Today ({todayReminders.length})
                </p>
                {todayReminders.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onSelect={onSelectReminder} />
                ))}
              </div>
            )}

            {/* 2. Overdue */}
            {overdueReminders.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-bold uppercase tracking-wider text-rose-600">
                  Overdue ({overdueReminders.length})
                </p>
                {overdueReminders.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onSelect={onSelectReminder} />
                ))}
              </div>
            )}

            {/* 3. Due Tomorrow */}
            {tomorrowReminders.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-bold uppercase tracking-wider text-amber-600">
                  Due Tomorrow ({tomorrowReminders.length})
                </p>
                {tomorrowReminders.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onSelect={onSelectReminder} />
                ))}
              </div>
            )}

            {/* 4. Due in 2 Days */}
            {upcomingReminders.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 text-[12px] font-bold uppercase tracking-wider text-muted">
                  Due in 2 Days ({upcomingReminders.length})
                </p>
                {upcomingReminders.map((r) => (
                  <ReminderCard key={r.id} reminder={r} onSelect={onSelectReminder} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Explanatory Footer */}
        <div className="rounded-[16px] bg-canvas/60 p-3 text-[12px] text-muted space-y-1">
          <p className="font-semibold text-ink">How reminders work:</p>
          <p>• Notifies you 2 days before, 1 day before, and on the due date.</p>
          <p>• Follows up daily if bills remain unpaid or debts are uncollected.</p>
          <p>• Stops automatically as soon as payment is recorded or settled.</p>
        </div>
      </div>
    </Sheet>
  );
}

function ReminderCard({
  reminder,
  onSelect,
}: {
  reminder: DueReminder;
  onSelect: (group: Group, item: Item) => void;
}) {
  const isDanger = reminder.urgency === 'today' || reminder.urgency === 'overdue';

  return (
    <button
      type="button"
      onClick={() => onSelect(reminder.group, reminder.item)}
      className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-white p-3.5 text-left ring-1 ring-black/[0.06] transition hover:shadow-sm active:scale-[0.99]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
              isDanger
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
            }`}
          >
            {reminder.badgeLabel}
          </span>
          <span className="truncate text-[12px] font-medium text-muted">
            {reminder.group.name}
          </span>
        </div>

        <p className="mt-1 truncate text-[15px] font-bold text-ink">
          {reminder.item.description}
        </p>

        <p className="mt-0.5 text-[12px] text-muted">
          Due: {formatDueDateReadable(reminder.dueDate)}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <p className={`text-[16px] font-extrabold ${isDanger ? 'text-bad' : 'text-ink'}`}>
          {formatMoney(reminder.amountCents)}
        </p>
        <ChevronRight className="size-4 text-muted/60" />
      </div>
    </button>
  );
}
