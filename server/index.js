require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const { initDb } = require('./db');

// ── Validate required environment variables ───────────────────────────────────
const required = ['JWT_SECRET', 'ADMIN_KEY', 'HOUSE_WALLET_SOLANA', 'HOUSE_WALLET_BASE'];
const missing  = required.filter(k => !process.env[k]);
if (missing.length) {
    console.error('[startup] Missing required env vars:', missing.join(', '));
    console.error('[startup] Copy server/.env.example to server/.env and fill in the values.');
    process.exit(1);
}

// ── App setup ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
initDb();

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/payment',     require('./routes/payment'));
app.use('/api/score',       require('./routes/score'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/admin',       require('./routes/admin'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── Cron jobs ─────────────────────────────────────────────────────────────────
require('./cron');

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[server] Pac-Man payment server running on port ${PORT}`);
});
