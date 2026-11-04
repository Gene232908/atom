import { useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  Send,
} from 'lucide-react';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { formatMoney } from '../../lib/money';
import { formatDueDateReadable } from '../../lib/loanUtils';
import {
  getNotificationPermission,
  isPushSupported,
  sendInstantTestNotification,
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
  const [testing, setTesting] = useState(false);
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

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await sendInstantTestNotification();
      setPermission(getNotificationPermission());
      toast('Test notification sent to your device! 🚀');
    } catch (err: any) {
      toast(err?.message || 'Failed to send test alert.');
    } finally {
      setTesting(false);
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
        {/* Notification Permission Card */}
        <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06]">
          <div className="flex items-start gap-3">
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-full ${
                permission === 'granted'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              {permission === 'granted' ? (
                <Bell className="size-5" />
              ) : (
                <BellOff className="size-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold text-ink">
                  {permission === 'granted' ? 'Push Alerts Active' : 'Automatic Reminders'}
                </p>
                {permission === 'granted' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                {permission === 'granted'
                  ? 'You will receive push reminders 2 days before, 1 day before, on due dates, and daily follow-ups if unpaid.'
                  : 'Get notified 2 days before, on due dates, and daily if unpaid so you never miss a payment or collection.'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 pt-1 border-t border-hairline">
            {permission !== 'granted' && supported && (
              <Button
                size="sm"
                variant="primary"
                className="flex-1"
                disabled={enabling}
                onClick={handleEnableNotifications}
              >
                {enabling ? 'Enabling...' : 'Turn on Push Alerts'}
              </Button>
            )}
            <Button
              size="sm"
              variant={permission === 'granted' ? 'primary' : 'secondary'}
              className={permission === 'granted' ? 'w-full' : 'shrink-0'}
              disabled={testing}
              onClick={handleTestNotification}
              icon={<Send className="size-3.5" />}
            >
              {testing ? 'Sending alert...' : 'Send Test Notification'}
            </Button>
          </div>
        </div>

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
