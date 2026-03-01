const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();

// Anti-cheat thresholds
const MAX_SCORE      = 999990;  // absolute ceiling of the game
const MIN_FRAMES     = 1800;    // must play at least 30 seconds (60 fps × 30)
const MAX_PTS_FRAME  = 50;      // very generous upper bound on scoring rate
const VALID_MODES    = ['pacman', 'mspacman', 'cookie', 'otto'];

// ── POST /api/score/submit ────────────────────────────────────────────────────
// Accepts a final game score tied to a valid session token.
//
// Body: { token, score, frames, gameMode, turboMode }
router.post('/submit', (req, res) => {
    const { token, score, frames, gameMode, turboMode } = req.body || {};

    if (!token || score === undefined || !frames || !gameMode) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    // ── Type / range validation ──────────────────────────────────────────────
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        return res.status(400).json({ error: 'Invalid score value.' });
    }
    if (typeof frames !== 'number' || !Number.isInteger(frames) || frames < 0) {
        return res.status(400).json({ error: 'Invalid frames value.' });
    }
    if (!VALID_MODES.includes(gameMode)) {
        return res.status(400).json({ error: 'Invalid gameMode.' });
    }

    // ── Anti-cheat: scoring rate ─────────────────────────────────────────────
    if (frames < MIN_FRAMES && score > 100) {
        return res.status(400).json({ error: 'Game ended too quickly for that score.' });
    }
    if (score > frames * MAX_PTS_FRAME) {
        return res.status(400).json({ error: 'Score exceeds maximum possible for the reported game duration.' });
    }

    // ── Session token validation ─────────────────────────────────────────────
    let payload;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ error: 'Session token is invalid or has expired.' });
    }

    const db = getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE session_token = ?').get(token);
    if (!payment) return res.status(404).json({ error: 'Session not found.' });
    if (payment.score_submitted) {
        return res.status(409).json({ error: 'A score has already been submitted for this session.' });
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const now    = Math.floor(Date.now() / 1000);

    db.prepare(`
        INSERT INTO scores
            (payment_id, wallet_address, chain, score, game_frames, game_mode, turbo_mode, submitted_at, day_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(payment.id, payment.wallet_address, payment.chain, score, frames,
           gameMode, turboMode ? 1 : 0, now, dayKey);

    db.prepare('UPDATE payments SET score_submitted = 1 WHERE session_token = ?').run(token);

    // Return the player's rank for today
    const rank = db.prepare(`
        SELECT COUNT(*) AS cnt FROM scores WHERE day_key = ? AND score > ?
    `).get(dayKey, score).cnt + 1;

    res.json({ success: true, rank });
});

module.exports = router;
