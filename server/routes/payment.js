const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPaymentAmounts, ENTRY_FEE_USD } = require('../services/prices');
const { verifyTransaction: verifySolana } = require('../services/solana');
const { verifyTransaction: verifyBase } = require('../services/base');
const { getDb } = require('../db');

const router = express.Router();

// ── GET /api/payment/info ─────────────────────────────────────────────────────
// Returns current payment addresses and token amounts for the entry fee.
router.get('/info', async (req, res) => {
    try {
        const amounts = await getPaymentAmounts();
        res.json({
            entryFeeUsd: ENTRY_FEE_USD,
            solana: {
                address: process.env.HOUSE_WALLET_SOLANA,
                amount: amounts.sol.amountStr,
                price: amounts.sol.price,
            },
            base: {
                address: process.env.HOUSE_WALLET_BASE,
                amount: amounts.eth.amountStr,
                price: amounts.eth.price,
            },
        });
    } catch (err) {
        console.error('[payment/info]', err.message);
        res.status(503).json({ error: 'Price feed temporarily unavailable. Try again in a moment.' });
    }
});

// ── POST /api/payment/verify ──────────────────────────────────────────────────
// Verifies a blockchain transaction and issues a one-use game session token.
//
// Body: { chain, txSignature, walletAddress }
router.post('/verify', async (req, res) => {
    const { chain, txSignature, walletAddress } = req.body || {};

    if (!chain || !txSignature || !walletAddress) {
        return res.status(400).json({ error: 'Missing required fields: chain, txSignature, walletAddress.' });
    }
    if (!['solana', 'base'].includes(chain)) {
        return res.status(400).json({ error: 'Invalid chain. Must be "solana" or "base".' });
    }

    // Sanitise inputs
    const sig = txSignature.trim();
    const wallet = walletAddress.trim();

    const db = getDb();

    // Reject duplicate transactions
    const duplicate = db.prepare('SELECT id FROM payments WHERE tx_signature = ?').get(sig);
    if (duplicate) {
        return res.status(409).json({ error: 'This transaction has already been used for a game session.' });
    }

    try {
        const amounts = await getPaymentAmounts();
        let amountNative, priceAtPayment;

        if (chain === 'solana') {
            const result = await verifySolana(sig, amounts.sol.amount);
            amountNative = result.amountSol.toString();
            priceAtPayment = amounts.sol.price;
        } else {
            const result = await verifyBase(sig, amounts.eth.amount);
            amountNative = result.amountEth.toString();
            priceAtPayment = amounts.eth.price;
        }

        // Issue session token (valid 2 hours, one use)
        const sessionId = uuidv4();
        const token = jwt.sign(
            { sessionId, walletAddress: wallet, chain },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC

        db.prepare(`
            INSERT INTO payments
                (wallet_address, chain, tx_signature, amount_native, amount_usd,
                 price_at_payment, session_token, created_at, day_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(wallet, chain, sig, amountNative, ENTRY_FEE_USD, priceAtPayment,
               token, Math.floor(Date.now() / 1000), dayKey);

        res.json({ token, expiresIn: 7200 });

    } catch (err) {
        console.error('[payment/verify]', err.message);
        res.status(400).json({ error: err.message });
    }
});

// ── GET /api/payment/session/:token ──────────────────────────────────────────
// Validates an existing session token (used on page refresh).
router.get('/session/:token', (req, res) => {
    try {
        jwt.verify(req.params.token, process.env.JWT_SECRET);
    } catch {
        return res.status(401).json({ valid: false, error: 'Session expired or invalid.' });
    }

    const db = getDb();
    const payment = db.prepare('SELECT score_submitted FROM payments WHERE session_token = ?')
        .get(req.params.token);

    if (!payment) return res.status(404).json({ valid: false, error: 'Session not found.' });
    if (payment.score_submitted) return res.json({ valid: false, error: 'Score already submitted for this session.' });

    res.json({ valid: true });
});

module.exports = router;
