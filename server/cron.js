import cron from 'node-cron';
import { checkExpiredSubscriptions } from './services/subscriptionService.js';

cron.schedule('5 0 * * *', async () => {
  console.log('[cron] checkExpiredSubscriptions — start');
  try {
    await checkExpiredSubscriptions();
    console.log('[cron] checkExpiredSubscriptions — done');
  } catch (err) {
    console.error('[cron] checkExpiredSubscriptions — error:', err.message);
  }
});

console.log('[cron] Scheduled jobs registered');
