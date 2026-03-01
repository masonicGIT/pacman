const express = require('express');
const { getDb } = require('../db');
const { distributeWinnings } = require('../services/payout');

const router = express.Router();

// All admin routes require the X-Admin-Key header
router.use((req, res, next) => {
    const key = req.headers['x-admin-key'];
    if (!key || key !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorised.' });
    }
    next();
});

// ── GET /api/admin/day/:dayKey ────────────────────────────────────────────────
// Summary for a given UTC day (format: YYYY-MM-DD).
router.get('/day/:dayKey', (req, res) => {
    const db = getDb();
    const { dayKey } = req.params;

    const winner = db.prepare(`
        SELECT s.wallet_address, s.chain, s.score, s.game_mode, s.turbo_mode, s.submitted_at
        FROM   scores s
        WHERE  s.day_key = ?
        ORDER  BY s.score DESC, s.submitted_at ASC
        LIMIT  1
    `).get(dayKey);

    const pot = db.prepare(`
        SELECT
            SUM(CASE WHEN chain = 'solana' THEN CAST(amount_native AS REAL) ELSE 0 END) AS sol_total,
            SUM(CASE WHEN chain = 'base'   THEN CAST(amount_native AS REAL) ELSE 0 END) AS eth_total,
            SUM(amount_usd)  AS usd_total,
            COUNT(*)         AS player_count
        FROM payments
        WHERE day_key = ?
    `).get(dayKey);

    const existing = db.prepare('SELECT * FROM winners WHERE day_key = ?').get(dayKey);

    res.json({
        dayKey,
        winner: winner || null,
        pot: {
            sol: (pot.sol_total || 0).toFixed(6) + ' SOL',
            eth: (pot.eth_total || 0).toFixed(8) + ' ETH',
            usd: '$' + (pot.usd_total || 0).toFixed(2),
            players: pot.player_count || 0,
        },
        prizes: {
            sol: ((pot.sol_total || 0) * 0.9).toFixed(6) + ' SOL',
            eth: ((pot.eth_total || 0) * 0.9).toFixed(8) + ' ETH',
        },
        house: {
            sol: ((pot.sol_total || 0) * 0.1).toFixed(6) + ' SOL',
            eth: ((pot.eth_total || 0) * 0.1).toFixed(8) + ' ETH',
        },
        payoutRecord: existing || null,
    });
});

// ── POST /api/admin/payout/:dayKey ───────────────────────────────────────────
// Trigger prize distribution for a given day.
router.post('/payout/:dayKey', async (req, res) => {
    try {
        const result = await distributeWinnings(req.params.dayKey);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ── PATCH /api/admin/payout/:dayKey/mark-paid ────────────────────────────────
// Mark a day as manually paid out (after completing a manual transfer).
router.patch('/payout/:dayKey/mark-paid', (req, res) => {
    const db = getDb();
    const { notes } = req.body || {};
    const info = db.prepare(`
        UPDATE winners SET payout_status = 'paid', notes = ? WHERE day_key = ?
    `).run(notes || 'marked paid manually', req.params.dayKey);

    if (info.changes === 0) {
        return res.status(404).json({ error: 'No winner record found for that day.' });
    }
    res.json({ success: true });
});

// ── GET /api/admin/payments ───────────────────────────────────────────────────
// List recent payments (for auditing).
router.get('/payments', (req, res) => {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const page  = Math.max(parseInt(req.query.page  || '1',  10), 1);

    const rows = db.prepare(`
        SELECT id, wallet_address, chain, tx_signature, amount_native,
               amount_usd, session_used, score_submitted, created_at, day_key
        FROM   payments
        ORDER  BY created_at DESC
        LIMIT  ? OFFSET ?
    `).all(limit, (page - 1) * limit);

    res.json({ page, limit, payments: rows });
});

module.exports = router;
