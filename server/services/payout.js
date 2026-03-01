// Payout service — selects the daily winner and distributes prizes.
//
// Prize split: 90% to winner (on their payment chain), 10% stays in house wallet.
//
// Automated payouts:
//   Set HOUSE_PRIVATE_KEY_SOLANA and/or HOUSE_PRIVATE_KEY_BASE in .env.
//   If not set, payout details are returned for manual transfer.
//
// Chain pots are tracked separately:
//   - Solana players contribute to the SOL pot; winner is paid in SOL.
//   - Base players contribute to the ETH pot; winner is paid in ETH.
//   - If the winner paid on Solana but there is also an ETH pot (or vice versa),
//     the other chain's pot rolls over to the next day automatically.

const { getDb } = require('../db');
const { sendSol } = require('./solana');
const { sendEth } = require('./base');

async function distributeWinnings(dayKey) {
    const db = getDb();

    // Prevent double-payout
    const existing = db.prepare('SELECT * FROM winners WHERE day_key = ?').get(dayKey);
    if (existing && existing.payout_status === 'paid') {
        throw new Error(`Day ${dayKey} has already been paid out.`);
    }

    // Find the highest score for the day (tie-break: earliest submission)
    const winner = db.prepare(`
        SELECT s.wallet_address, s.chain, s.score, s.submitted_at
        FROM   scores s
        WHERE  s.day_key = ?
        ORDER  BY s.score DESC, s.submitted_at ASC
        LIMIT  1
    `).get(dayKey);

    if (!winner) throw new Error(`No scores found for ${dayKey}.`);

    // Tally the pots
    const pot = db.prepare(`
        SELECT
            SUM(CASE WHEN chain = 'solana' THEN CAST(amount_native AS REAL) ELSE 0 END) AS sol_total,
            SUM(CASE WHEN chain = 'base'   THEN CAST(amount_native AS REAL) ELSE 0 END) AS eth_total,
            SUM(amount_usd) AS usd_total,
            COUNT(*) AS player_count
        FROM payments
        WHERE day_key = ?
    `).get(dayKey);

    const solTotal = pot.sol_total || 0;
    const ethTotal = pot.eth_total || 0;
    const solPrize = solTotal * 0.9;
    const ethPrize = ethTotal * 0.9;

    // Record the winner before attempting transfers
    db.prepare(`
        INSERT OR REPLACE INTO winners
            (day_key, wallet_address, chain, score, sol_pot, eth_pot, sol_prize, eth_prize, payout_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(dayKey, winner.wallet_address, winner.chain, winner.score,
           solTotal, ethTotal, solPrize, ethPrize, Math.floor(Date.now() / 1000));

    const result = {
        dayKey,
        winner: {
            walletAddress: winner.wallet_address,
            chain: winner.chain,
            score: winner.score,
        },
        pots: {
            sol: solTotal.toFixed(6) + ' SOL',
            eth: ethTotal.toFixed(8) + ' ETH',
            usdEstimate: '$' + (pot.usd_total || 0).toFixed(2),
            playerCount: pot.player_count,
        },
        prizes: {
            sol: solPrize.toFixed(6) + ' SOL  (90% of SOL pot)',
            eth: ethPrize.toFixed(8) + ' ETH  (90% of ETH pot)',
            usdEstimate: '$' + ((pot.usd_total || 0) * 0.9).toFixed(2),
        },
        house: {
            sol: (solTotal * 0.1).toFixed(6) + ' SOL',
            eth: (ethTotal * 0.1).toFixed(8) + ' ETH',
        },
        payoutStatus: {},
    };

    let allPaid = true;

    // — SOL prize —
    if (solPrize > 0) {
        if (process.env.HOUSE_PRIVATE_KEY_SOLANA) {
            try {
                const sig = await sendSol(winner.wallet_address, solPrize);
                result.payoutStatus.sol = 'sent — tx: ' + sig;
            } catch (err) {
                result.payoutStatus.sol = 'FAILED: ' + err.message;
                allPaid = false;
            }
        } else {
            result.payoutStatus.sol = 'manual_required';
            allPaid = false;
        }
    } else {
        result.payoutStatus.sol = 'no_sol_pot';
    }

    // — ETH prize —
    if (ethPrize > 0) {
        if (process.env.HOUSE_PRIVATE_KEY_BASE) {
            try {
                const hash = await sendEth(winner.wallet_address, ethPrize);
                result.payoutStatus.eth = 'sent — tx: ' + hash;
            } catch (err) {
                result.payoutStatus.eth = 'FAILED: ' + err.message;
                allPaid = false;
            }
        } else {
            result.payoutStatus.eth = 'manual_required';
            allPaid = false;
        }
    } else {
        result.payoutStatus.eth = 'no_eth_pot';
    }

    if (allPaid) {
        db.prepare("UPDATE winners SET payout_status = 'paid' WHERE day_key = ?").run(dayKey);
        result.status = 'paid';
    } else {
        result.status = 'partial_or_manual';
        result.note = 'Complete any manual transfers listed above, then call PATCH /api/admin/payout/:dayKey/mark-paid.';
    }

    return result;
}

module.exports = { distributeWinnings };
