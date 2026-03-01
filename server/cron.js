// Daily cron job — runs at UTC midnight to distribute the day's prizes.
// node-cron uses cron syntax: second(opt) minute hour day month weekday

const cron = require('node-cron');
const { distributeWinnings } = require('./services/payout');

// "0 0 * * *"  →  every day at 00:00 UTC
cron.schedule('0 0 * * *', async () => {
    // Pay out *yesterday* (the day that just ended at midnight UTC)
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 1);
    const dayKey = d.toISOString().slice(0, 10);

    console.log(`[cron] Starting daily payout for ${dayKey}`);
    try {
        const result = await distributeWinnings(dayKey);
        console.log('[cron] Payout result:', JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('[cron] Payout failed for', dayKey, '—', err.message);
    }
}, { timezone: 'UTC' });

console.log('[cron] Daily payout scheduler active (fires at UTC midnight)');
