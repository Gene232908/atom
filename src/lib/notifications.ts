import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { computeLoanStats, formatDueDateReadable } from './loanUtils';
import { isItemDone, otherShares, firstName } from './items';
import { formatMoney } from './money';
import type { Group, Item } from './types';

export type ItemWithGroup = Item & { group?: Group };

export const VAPID_PUBLIC_KEY = 'BEf3rItEe3rpVTqxXWiGDz2rXlTs5Xyx17_II-cJLB88DBlTRPhkgd30zu1tsqvSX3Nic7A06Q3JwRJOuYLZ6Pg';

const NOTIFIED_STORAGE_KEY = 'utang_reminders_last_sent_v1';

export type ReminderType = 'loan' | 'peer_lend' | 'peer_owe';
export type ReminderUrgency = 'overdue' | 'today' | 'tomorrow' | 'two_days';

export interface DueReminder {
  id: string;
  type: ReminderType;
  title: string;
  body: string;
  item: Item;
  group: Group;
  amountCents: number;
  dueDate: string; // YYYY-MM-DD
  daysDiff: number; // 2 = in 2 days, 1 = tomorrow, 0 = today, < 0 = overdue
  urgency: ReminderUrgency;
  badgeLabel: string;
}

/** Convert base64 url-safe string to Uint8Array for PushManager */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Computes difference in calendar days between targetDateStr and todayDateStr (YYYY-MM-DD) */
export function diffCalendarDays(targetDateStr: string, todayDateStr: string): number {
  const parts1 = targetDateStr.split('-');
  const parts2 = todayDateStr.split('-');
  if (parts1.length < 3 || parts2.length < 3) return 999;

  const y1 = parseInt(parts1[0], 10);
  const m1 = parseInt(parts1[1], 10) - 1;
  const d1 = parseInt(parts1[2], 10);

  const y2 = parseInt(parts2[0], 10);
  const m2 = parseInt(parts2[1], 10) - 1;
  const d2 = parseInt(parts2[2], 10);

  const t1 = new Date(y1, m1, d1).getTime();
  const t2 = new Date(y2, m2, d2).getTime();
  return Math.round((t1 - t2) / 86400000);
}

/** Returns today's date formatted as YYYY-MM-DD in local time */
export function getLocalTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Evaluates all items and groups to find bills and collections requiring reminders:
 * 1. 2 days before due date
 * 2. 1 day before due date (tomorrow)
 * 3. On the due date (today)
 * 4. Overdue (daily reminder until paid)
 * 5. AUTO-STOP: If fully paid or marked paid for the term, stops notifying until the next cycle.
 */
export function evaluateDueReminders(
  items: ItemWithGroup[],
  groups: Group[],
  currentUserId: string,
  todayStr = getLocalTodayDateString(),
): DueReminder[] {
  const reminders: DueReminder[] = [];
  const groupMap = new Map<string, Group>();
  for (const g of groups) groupMap.set(g.id, g);

  for (const item of items) {
    const group = item.group || groupMap.get(item.id) || groups.find((g) => g.id === (item as any).groupId);
    if (!group) continue;

    // A. Personal Loans (Self loan, motorcycle, gadgets, etc.)
    const isLoan = item.isPersonalLoan || group.groupType === 'loan';
    if (isLoan && group.ownerId === currentUserId) {
      const stats = computeLoanStats(item);
      // Auto-stop: if user has completed all payments, do not notify
      if (stats.isFullyPaid || !stats.nextDueDate) continue;

      const daysDiff = diffCalendarDays(stats.nextDueDate, todayStr);
      const amount = stats.monthlyCents > 0 ? stats.monthlyCents : stats.remainingCents;
      const formattedAmount = formatMoney(amount);
      const formattedDate = formatDueDateReadable(stats.nextDueDate);
      const termInfo = stats.nextTermNumber ? ` (Term ${stats.nextTermNumber}/${stats.totalTerms})` : '';

      // Check reminder conditions: 2 days before, 1 day before, today (0), or overdue (<0)
      if (daysDiff === 0) {
        reminders.push({
          id: `loan_${item.id}_due_${stats.nextDueDate}`,
          type: 'loan',
          title: 'Reminder:',
          body: `Please pay your bill of ${formattedAmount} for ${item.description} (${group.name}) today!${termInfo}`,
          item,
          group,
          amountCents: amount,
          dueDate: stats.nextDueDate,
          daysDiff,
          urgency: 'today',
          badgeLabel: 'Due Today',
        });
      } else if (daysDiff === 1) {
        reminders.push({
          id: `loan_${item.id}_due_${stats.nextDueDate}`,
          type: 'loan',
          title: 'Reminder:',
          body: `Please prepare ${formattedAmount} for ${item.description} (${group.name}) due tomorrow (${formattedDate}).${termInfo}`,
          item,
          group,
          amountCents: amount,
          dueDate: stats.nextDueDate,
          daysDiff,
          urgency: 'tomorrow',
          badgeLabel: 'Due Tomorrow',
        });
      } else if (daysDiff === 2) {
        reminders.push({
          id: `loan_${item.id}_due_${stats.nextDueDate}`,
          type: 'loan',
          title: 'Reminder:',
          body: `Please prepare ${formattedAmount} for ${item.description} (${group.name}) due in 2 days (${formattedDate}).${termInfo}`,
          item,
          group,
          amountCents: amount,
          dueDate: stats.nextDueDate,
          daysDiff,
          urgency: 'two_days',
          badgeLabel: 'Due in 2 Days',
        });
      } else if (daysDiff < 0) {
        const lateDays = Math.abs(daysDiff);
        reminders.push({
          id: `loan_${item.id}_due_${stats.nextDueDate}`,
          type: 'loan',
          title: 'Reminder:',
          body: `Please pay your bill of ${formattedAmount} for ${item.description} (${group.name}). Was due ${lateDays} day${lateDays > 1 ? 's' : ''} ago (${formattedDate}).`,
          item,
          group,
          amountCents: amount,
          dueDate: stats.nextDueDate,
          daysDiff,
          urgency: 'overdue',
          badgeLabel: `${lateDays}d Overdue`,
        });
      }
      continue;
    }

    // B. Peer lending cards (You lent money to someone)
    if (group.ownerId === currentUserId && item.dueDate && !isItemDone(item, currentUserId)) {
      const daysDiff = diffCalendarDays(item.dueDate, todayStr);
      if (daysDiff > 2) continue; // Not within 2-day reminder window yet

      const others = otherShares(item, currentUserId);

      for (const [uid, share] of others) {
        if (share.status === 'paid') continue; // Auto-stop: person has paid!
        const paid = share.paidCents ?? 0;
        const remaining = Math.max(0, item.splitCents - paid);
        if (remaining <= 0) continue;

        const borrowerName = firstName(share.name || 'Friend');
        const formattedAmount = formatMoney(remaining);

        if (daysDiff === 0) {
          reminders.push({
            id: `peer_lend_${item.id}_${uid}_${item.dueDate}`,
            type: 'peer_lend',
            title: 'Reminder:',
            body: `Please collect ${formattedAmount} from ${borrowerName} for ${item.description} (${group.name}) today!`,
            item,
            group,
            amountCents: remaining,
            dueDate: item.dueDate,
            daysDiff,
            urgency: 'today',
            badgeLabel: 'Collect Today',
          });
        } else if (daysDiff === 1) {
          reminders.push({
            id: `peer_lend_${item.id}_${uid}_${item.dueDate}`,
            type: 'peer_lend',
            title: 'Reminder:',
            body: `Please follow up ${borrowerName} for ${formattedAmount} (${item.description}) due tomorrow.`,
            item,
            group,
            amountCents: remaining,
            dueDate: item.dueDate,
            daysDiff,
            urgency: 'tomorrow',
            badgeLabel: 'Collect Tomorrow',
          });
        } else if (daysDiff === 2) {
          reminders.push({
            id: `peer_lend_${item.id}_${uid}_${item.dueDate}`,
            type: 'peer_lend',
            title: 'Reminder:',
            body: `Please follow up ${borrowerName} for ${formattedAmount} (${item.description}) due in 2 days.`,
            item,
            group,
            amountCents: remaining,
            dueDate: item.dueDate,
            daysDiff,
            urgency: 'two_days',
            badgeLabel: 'Collect in 2 Days',
          });
        } else if (daysDiff < 0) {
          const lateDays = Math.abs(daysDiff);
          reminders.push({
            id: `peer_lend_${item.id}_${uid}_${item.dueDate}`,
            type: 'peer_lend',
            title: 'Reminder:',
            body: `Please collect ${formattedAmount} from ${borrowerName} for ${item.description} (${group.name}). Was due ${lateDays} day${lateDays > 1 ? 's' : ''} ago.`,
            item,
            group,
            amountCents: remaining,
            dueDate: item.dueDate,
            daysDiff,
            urgency: 'overdue',
            badgeLabel: `${lateDays}d Overdue`,
          });
        }
      }
      continue;
    }

    // C. Cards you joined where you owe money
    if (group.ownerId !== currentUserId && item.dueDate) {
      if (group.members[currentUserId]?.status === 'pending') continue;
      const myShare = item.shares?.[currentUserId];
      if (!myShare || myShare.status === 'paid') continue; // Auto-stop: you paid!

      const paid = myShare.paidCents ?? 0;
      const remaining = Math.max(0, item.splitCents - paid);
      if (remaining <= 0) continue;

      const daysDiff = diffCalendarDays(item.dueDate, todayStr);
      if (daysDiff > 2) continue;

      const formattedAmount = formatMoney(remaining);

      if (daysDiff === 0) {
        reminders.push({
          id: `peer_owe_${item.id}_${item.dueDate}`,
          type: 'peer_owe',
          title: 'Reminder:',
          body: `Please pay your share of ${formattedAmount} to ${group.name} for ${item.description} today!`,
          item,
          group,
          amountCents: remaining,
          dueDate: item.dueDate,
          daysDiff,
          urgency: 'today',
          badgeLabel: 'Due Today',
        });
      } else if (daysDiff === 1) {
        reminders.push({
          id: `peer_owe_${item.id}_${item.dueDate}`,
          type: 'peer_owe',
          title: 'Reminder:',
          body: `Please prepare ${formattedAmount} to ${group.name} for ${item.description} due tomorrow.`,
          item,
          group,
          amountCents: remaining,
          dueDate: item.dueDate,
          daysDiff,
          urgency: 'tomorrow',
          badgeLabel: 'Due Tomorrow',
        });
      } else if (daysDiff === 2) {
        reminders.push({
          id: `peer_owe_${item.id}_${item.dueDate}`,
          type: 'peer_owe',
          title: 'Reminder:',
          body: `Please prepare ${formattedAmount} to ${group.name} for ${item.description} due in 2 days.`,
          item,
          group,
          amountCents: remaining,
          dueDate: item.dueDate,
          daysDiff,
          urgency: 'two_days',
          badgeLabel: 'Due in 2 Days',
        });
      } else if (daysDiff < 0) {
        const lateDays = Math.abs(daysDiff);
        reminders.push({
          id: `peer_owe_${item.id}_${item.dueDate}`,
          type: 'peer_owe',
          title: 'Reminder:',
          body: `Please pay your overdue balance of ${formattedAmount} to ${group.name} for ${item.description}. Was due ${lateDays} day${lateDays > 1 ? 's' : ''} ago.`,
          item,
          group,
          amountCents: remaining,
          dueDate: item.dueDate,
          daysDiff,
          urgency: 'overdue',
          badgeLabel: `${lateDays}d Overdue`,
        });
      }
    }
  }

  // Sort by urgency: overdue first, then today, then tomorrow, then 2 days
  const urgencyWeight: Record<ReminderUrgency, number> = {
    overdue: 0,
    today: 1,
    tomorrow: 2,
    two_days: 3,
  };

  return reminders.sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency]);
}

/** Check if Web Push / Notifications are supported in this browser */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
}

/** Get current notification permission */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Registers the Service Worker if supported */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/** Requests browser permission and subscribes to Web Push notifications */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await registerServiceWorker();
    }
    if (!reg) return false;

    // Check if subscription already exists
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as any,
      });
    }

    if (subscription && userId) {
      const subJson = subscription.toJSON();
      // Generate clean key from endpoint
      const endpointHash = btoa(subscription.endpoint.slice(-32)).replace(/[/+=]/g, '_');
      const subRef = doc(db, 'users', userId, 'subscriptions', endpointHash);
      await setDoc(
        subRef,
        {
          endpoint: subscription.endpoint,
          keys: subJson.keys || {},
          updatedAt: Date.now(),
          userAgent: navigator.userAgent,
        },
        { merge: true },
      );

      // Also record permission status on user doc
      await setDoc(
        doc(db, 'users', userId),
        {
          notificationsEnabled: true,
          lastSubscribedAt: Date.now(),
        },
        { merge: true },
      );
    }

    return true;
  } catch (err) {
    console.error('Failed to subscribe to Web Push:', err);
    return false;
  }
}

/** Unsubscribes from Web Push notifications */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpointHash = btoa(sub.endpoint.slice(-32)).replace(/[/+=]/g, '_');
        await sub.unsubscribe();
        if (userId) {
          try {
            await deleteDoc(doc(db, 'users', userId, 'subscriptions', endpointHash));
          } catch {
            // ignore
          }
        }
      }
    }
    if (userId) {
      await setDoc(doc(db, 'users', userId), { notificationsEnabled: false }, { merge: true });
    }
    return true;
  } catch (err) {
    console.warn('Failed to unsubscribe:', err);
    return false;
  }
}

/**
 * Ensures user is subscribed to Web Push if permission is granted.
 * Called on startup/login to keep push tokens current.
 */
export async function ensurePushSubscribed(userId: string): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted' || !userId) {
    return false;
  }
  return subscribeToPush(userId);
}

/**
 * Fetches all active Web Push subscriptions stored for a given user.
 */
export async function getUserPushSubscriptions(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'subscriptions'));
    const list: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data && data.endpoint && data.keys) {
        list.push({
          id: d.id,
          endpoint: data.endpoint,
          keys: data.keys,
        });
      }
    });
    return list;
  } catch (err) {
    console.warn('Failed to fetch subscriptions for user', userId, err);
    return [];
  }
}

/**
 * Sends a real Web Push notification via the serverless /api/send-push endpoint.
 * This delivers directly to the user's phone via Google FCM or Apple APNs even if
 * the phone is locked, asleep, or the app is closed!
 */
export async function sendPushNotificationToUser(
  targetUserId: string,
  payload: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
    targetTab?: string;
    groupId?: string;
    itemId?: string;
  },
): Promise<{ success: boolean; delivered: number }> {
  if (!targetUserId) return { success: false, delivered: 0 };
  try {
    const subs = await getUserPushSubscriptions(targetUserId);
    if (subs.length === 0) {
      return { success: false, delivered: 0 };
    }

    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptions: subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
        title: payload.title,
        body: payload.body,
        url: payload.url || '/',
        tag: payload.tag || 'utang_push',
        targetTab: payload.targetTab || '',
        groupId: payload.groupId || '',
        itemId: payload.itemId || '',
      }),
    });

    if (!res.ok) {
      console.warn('send-push returned status', res.status);
      return { success: false, delivered: 0 };
    }

    const data = await res.json();

    // Clean up any expired endpoints that Apple/Google reported as gone
    if (Array.isArray(data.expiredEndpoints) && data.expiredEndpoints.length > 0) {
      for (const s of subs) {
        if (data.expiredEndpoints.includes(s.endpoint)) {
          try {
            await deleteDoc(doc(db, 'users', targetUserId, 'subscriptions', s.id));
          } catch {
            // ignore
          }
        }
      }
    }

    return { success: true, delivered: data.delivered || 0 };
  } catch (err) {
    console.error('sendPushNotificationToUser error:', err);
    return { success: false, delivered: 0 };
  }
}


/** Shows a native system notification via the Service Worker */
export async function showSystemNotification(title: string, options: NotificationOptions): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const enrichedOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    renotify: true,
    vibrate: [200, 100, 200],
    ...options,
  };

  try {
    let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
    if (!reg) reg = await registerServiceWorker();
    if (reg) {
      await (reg as any).showNotification(title, enrichedOptions);
      return;
    }
  } catch (err) {
    console.warn('Service worker showNotification failed, trying fallback:', err);
  }

  // Fallback if service worker is not active
  try {
    new Notification(title, enrichedOptions);
  } catch (err) {
    console.warn('Fallback Notification() failed:', err);
  }
}

/**
 * Checks all active reminders and dispatches native notifications.
 * Automatically throttles so each item is only notified once per calendar day.
 */
export async function checkAndDispatchDueReminders(
  items: ItemWithGroup[],
  groups: Group[],
  userId: string,
): Promise<{ dispatchedCount: number; reminders: DueReminder[] }> {
  const reminders = evaluateDueReminders(items, groups, userId);
  if (reminders.length === 0 || !isPushSupported() || Notification.permission !== 'granted') {
    return { dispatchedCount: 0, reminders };
  }

  const todayStr = getLocalTodayDateString();
  let sentMap: Record<string, string> = {};
  try {
    const stored = localStorage.getItem(NOTIFIED_STORAGE_KEY);
    if (stored) sentMap = JSON.parse(stored);
  } catch {
    sentMap = {};
  }

  let dispatchedCount = 0;
  for (const r of reminders) {
    // Only send once per calendar day per reminder ID
    if (sentMap[r.id] === todayStr) continue;

    await showSystemNotification(r.title, {
      body: r.body,
      tag: r.id,
      data: {
        url: '/',
        itemId: r.item.id,
        groupId: r.group.id,
      },
    } as any);

    sentMap[r.id] = todayStr;
    dispatchedCount++;
  }

  try {
    localStorage.setItem(NOTIFIED_STORAGE_KEY, JSON.stringify(sentMap));
  } catch {
    // ignore
  }

  return { dispatchedCount, reminders };
}

/** Sends an instant test push notification to verify setup */
export async function sendInstantTestNotification(): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error('Notifications are not supported in this browser.');
  }

  let perm = Notification.permission;
  if (perm !== 'granted') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    throw new Error('Notification permission was denied. Please allow notifications in your browser settings.');
  }

  await showSystemNotification('Reminder:', {
    body: 'Please pay your bill of ₱3,500 for PCX 160 (Sumisho) today!',
    tag: 'test_notification',
    data: { url: '/' },
  });

  return true;
}

/** Checks and dispatches push notification for incoming friend requests */
export async function checkAndDispatchFriendRequestNotification(
  incomingRequests: { uid: string; name: string; email?: string }[],
): Promise<void> {
  if (incomingRequests.length === 0 || !isPushSupported() || Notification.permission !== 'granted') {
    return;
  }
  const key = `friend_req_${incomingRequests.map((r) => r.uid).sort().join('_')}`;
  try {
    const stored = localStorage.getItem('last_notified_friend_req');
    if (stored === key) return;
  } catch {
    // ignore
  }

  const names = incomingRequests.map((r) => r.name).join(', ');
  const title = incomingRequests.length === 1 ? 'New Friend Request' : `${incomingRequests.length} Friend Requests`;
  const body =
    incomingRequests.length === 1
      ? `${names} sent you a friend request on Utang List!`
      : `${names} want to connect with you on Utang List!`;

  await showSystemNotification(title, {
    body,
    tag: incomingRequests.length === 1 ? `friend_req_${incomingRequests[0].uid}` : 'friend_requests',
    data: { url: '/' },
  });

  try {
    localStorage.setItem('last_notified_friend_req', key);
  } catch {
    // ignore
  }
}

/** Checks and dispatches push notification for incoming card invitations */
export async function checkAndDispatchCardInviteNotification(
  pendingCardInvites: Group[],
): Promise<void> {
  if (pendingCardInvites.length === 0 || !isPushSupported() || Notification.permission !== 'granted') {
    return;
  }
  const key = `card_invite_${pendingCardInvites.map((g) => g.id).sort().join('_')}`;
  try {
    const stored = localStorage.getItem('last_notified_card_invite');
    if (stored === key) return;
  } catch {
    // ignore
  }

  const firstCard = pendingCardInvites[0];
  const lenderName = firstCard.members[firstCard.ownerId]?.name || 'A friend';
  const title = pendingCardInvites.length === 1 ? 'New Card Invitation' : `${pendingCardInvites.length} Card Invitations`;
  const body =
    pendingCardInvites.length === 1
      ? `${lenderName} invited you to join "${firstCard.name}". Tap to review and accept!`
      : `You have ${pendingCardInvites.length} new card invitations from your friends. Tap to review and accept!`;

  await showSystemNotification(title, {
    body,
    tag: pendingCardInvites.length === 1 ? `card_invite_${firstCard.id}` : 'card_invites',
    data: { url: '/', targetTab: 'owe' },
  });

  try {
    localStorage.setItem('last_notified_card_invite', key);
  } catch {
    // ignore
  }
}
