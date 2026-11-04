import webpush from 'web-push';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BEf3rItEe3rpVTqxXWiGDz2rXlTs5Xyx17_II-cJLB88DBlTRPhkgd30zu1tsqvSX3Nic7A06Q3JwRJOuYLZ6Pg';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '2qcxzBaIZKKOVci9f3t7_pJ6ezP15gUmqb_NGh5SKHw';
const VAPID_SUBJECT = 'mailto:admin@utanglist.app';

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

  try {
    // If testing a single push to a provided subscription
    if (req.method === 'POST' && req.body && req.body.subscription) {
      const { subscription, title, body } = req.body;
      await webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: title || 'Reminder:',
          body: body || 'Please pay your bill or check your active cards today.',
          url: '/',
        }),
      );
      return res.status(200).json({ success: true, message: 'Push notification delivered' });
    }

    return res.status(200).json({
      success: true,
      service: 'Utang List Push Reminders',
      schedule: 'Daily at 01:00 UTC (09:00 AM PHT)',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Push error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Push dispatch failed' });
  }
}
