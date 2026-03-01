const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

// Shorten a wallet address for public display: first6...last4
function shortenWallet(addr) {
    if (!addr || addr.length < 12) return addr;
    return addr.slice(0, 6) + '...' + addr.slice(-4);
}

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
// Returns today's top 10 scores and prize pot totals.
router.get('/', (req, res) => {
    const db     = getDb();
    const dayKey = new Date().toISOString().slice(0, 10);

    const scores = db.prepare(`
        SELECT wallet_address, chain, score, game_mode, turbo_mode, submitted_at
        FROM   scores
        WHERE  day_key = ?
        ORDER  BY score DESC, submitted_at ASC
        LIMIT  10
    `).all(dayKey);

    const pot = db.prepare(`
        SELECT
            SUM(CASE WHEN chain = 'solana' THEN CAST(amount_native AS REAL) ELSE 0 END) AS sol_total,
            SUM(CASE WHEN chain = 'base'   THEN CAST(amount_native AS REAL) ELSE 0 END) AS eth_total,
            SUM(amount_usd) AS usd_total,
            COUNT(*)        AS player_count
        FROM payments
        WHERE day_key = ?
    `).get(dayKey);

    res.json({
        dayKey,
        scores: scores.map(s => ({
            wallet:    shortenWallet(s.wallet_address),
            chain:     s.chain,
            score:     s.score,
            gameMode:  s.game_mode,
            turbo:     s.turbo_mode === 1,
        })),
        pot: {
            solTotal:        +(pot.sol_total || 0).toFixed(6),
            ethTotal:        +(pot.eth_total || 0).toFixed(8),
            usdTotal:        +(pot.usd_total || 0).toFixed(2),
            playerCount:     pot.player_count || 0,
            winnerPrizeUsd:  +((pot.usd_total || 0) * 0.9).toFixed(2),
        },
    });
});

// ── GET /api/leaderboard/history ──────────────────────────────────────────────
// Returns the last 7 days of winners.
router.get('/history', (req, res) => {
    const db = getDb();
    const winners = db.prepare(`
        SELECT day_key, wallet_address, chain, score, sol_prize, eth_prize, payout_status
        FROM   winners
        ORDER  BY day_key DESC
        LIMIT  7
    `).all();

    res.json(winners.map(w => ({
        ...w,
        wallet: shortenWallet(w.wallet_address),
    })));
});

module.exports = router;
