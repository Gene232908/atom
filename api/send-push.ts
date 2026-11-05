import webpush from 'web-push';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BEf3rItEe3rpVTqxXWiGDz2rXlTs5Xyx17_II-cJLB88DBlTRPhkgd30zu1tsqvSX3Nic7A06Q3JwRJOuYLZ6Pg';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '2qcxzBaIZKKOVci9f3t7_pJ6ezP15gUmqb_NGh5SKHw';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@utanglist.app';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (e) {
  console.warn('VAPID setup warning:', e);
}

export default async function handler(req: any, res: any) {
  // Set CORS headers so frontend can call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(200).json({
      service: 'Utang List Push Dispatcher',
      status: 'active',
      method: req.method,
    });
  }

  try {
    const {
      subscriptions,
      subscription,
      title = 'Utang List',
      body = 'You have a new update.',
      url = '/',
      tag = 'utang_push',
      targetTab = '',
      groupId = '',
      itemId = '',
    } = req.body || {};

    const list: any[] = [];
    if (Array.isArray(subscriptions)) {
      list.push(...subscriptions);
    }
    if (subscription && typeof subscription === 'object') {
      list.push(subscription);
    }

    if (list.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid push subscriptions provided.',
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
      tag,
      renotify: true,
      url,
      targetTab,
      groupId,
      itemId,
      data: {
        url,
        targetTab,
        groupId,
        itemId,
      },
    });

    const pushOptions: any = {
      TTL: 86400, // 24 hours
      urgency: 'high', // Wake up sleeping/locked mobile phone immediately
    };

    const expiredEndpoints: string[] = [];
    let delivered = 0;
    let failed = 0;

    await Promise.allSettled(
      list.map(async (sub) => {
        if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
          failed++;
          return;
        }
        try {
          await webpush.sendNotification(sub, payload, pushOptions);
          delivered++;
        } catch (err: any) {
          failed++;
          // HTTP 404 or 410 means the subscription is no longer valid or unsubscribed
          if (err.statusCode === 404 || err.statusCode === 410) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.warn('Web push send error:', err.message || err);
          }
        }
      }),
    );

    return res.status(200).json({
      success: true,
      delivered,
      failed,
      expiredEndpoints,
    });
  } catch (error: any) {
    console.error('Push dispatch handler error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Push dispatch failed',
    });
  }
}
