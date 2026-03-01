// Solana transaction verification service
// Uses the public JSON-RPC API — swap SOLANA_RPC_URL for a paid endpoint in production.

const PRICE_TOLERANCE = 0.10;   // allow up to 10% below expected (price slippage)
const MAX_AGE_SECONDS = 7200;   // reject transactions older than 2 hours

function getRpcUrl() {
    return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
}

function getHouseWallet() {
    const w = process.env.HOUSE_WALLET_SOLANA;
    if (!w) throw new Error('HOUSE_WALLET_SOLANA is not configured');
    return w;
}

async function rpcCall(method, params) {
    const res = await fetch(getRpcUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    if (json.error) throw new Error('Solana RPC error: ' + json.error.message);
    return json.result;
}

/**
 * Verify a Solana SOL transfer to the house wallet.
 *
 * @param {string} signature   - Transaction signature from the player
 * @param {number} expectedSol - Expected minimum SOL amount (from price feed)
 * @returns {{ amountSol: number, blockTime: number }}
 */
async function verifyTransaction(signature, expectedSol) {
    const houseWallet = getHouseWallet();

    const tx = await rpcCall('getTransaction', [
        signature,
        { encoding: 'json', commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
    ]);

    if (!tx) throw new Error('Transaction not found — it may still be confirming. Try again in a moment.');
    if (tx.meta && tx.meta.err) throw new Error('Transaction failed on-chain.');

    // Find the house wallet in the account list
    const accounts = tx.transaction.message.accountKeys;
    const houseIdx = accounts.findIndex(a => a === houseWallet);
    if (houseIdx === -1) throw new Error('Payment not sent to the house wallet.');

    // SOL balance change at the house wallet index (in lamports)
    const received = tx.meta.postBalances[houseIdx] - tx.meta.preBalances[houseIdx];
    if (received <= 0) throw new Error('House wallet balance did not increase in this transaction.');

    const amountSol = received / 1e9;
    const minSol = expectedSol * (1 - PRICE_TOLERANCE);

    if (amountSol < minSol) {
        throw new Error(
            `Insufficient amount: received ${amountSol.toFixed(6)} SOL, ` +
            `minimum required ${minSol.toFixed(6)} SOL.`
        );
    }

    // Recency check
    const age = Math.floor(Date.now() / 1000) - tx.blockTime;
    if (age > MAX_AGE_SECONDS) throw new Error('Transaction is too old (must be within 2 hours).');

    return { amountSol, blockTime: tx.blockTime };
}

/**
 * Send SOL from the house wallet to a winner.
 * Requires HOUSE_PRIVATE_KEY_SOLANA to be set in the environment.
 * The key should be a JSON array of 64 bytes (Solana keypair).
 */
async function sendSol(toAddress, amountSol) {
    const {
        Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction,
    } = require('@solana/web3.js');

    const keyBytes = JSON.parse(process.env.HOUSE_PRIVATE_KEY_SOLANA);
    const fromKeypair = Keypair.fromSecretKey(Uint8Array.from(keyBytes));
    const connection = new Connection(getRpcUrl(), 'confirmed');

    const tx = new Transaction().add(
        SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: new PublicKey(toAddress),
            lamports: Math.floor(amountSol * 1e9),
        })
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [fromKeypair]);
    return sig;
}

module.exports = { verifyTransaction, sendSol };
