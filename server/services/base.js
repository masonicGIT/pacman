// Base (Ethereum L2) transaction verification service
// Verifies native ETH transfers on the Base mainnet.

const PRICE_TOLERANCE = 0.10;   // allow up to 10% below expected
const MAX_AGE_SECONDS = 7200;   // reject transactions older than 2 hours

function getRpcUrl() {
    return process.env.BASE_RPC_URL || 'https://mainnet.base.org';
}

function getHouseWallet() {
    const w = process.env.HOUSE_WALLET_BASE;
    if (!w) throw new Error('HOUSE_WALLET_BASE is not configured');
    return w.toLowerCase();
}

async function rpcCall(method, params) {
    const res = await fetch(getRpcUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    if (json.error) throw new Error('Base RPC error: ' + json.error.message);
    return json.result;
}

/**
 * Verify a Base (ETH) transfer to the house wallet.
 *
 * @param {string} txHash      - Transaction hash from the player
 * @param {number} expectedEth - Expected minimum ETH amount (from price feed)
 * @returns {{ amountEth: number, blockTime: number }}
 */
async function verifyTransaction(txHash, expectedEth) {
    const houseWallet = getHouseWallet();

    const [tx, receipt] = await Promise.all([
        rpcCall('eth_getTransactionByHash', [txHash]),
        rpcCall('eth_getTransactionReceipt', [txHash]),
    ]);

    if (!tx) throw new Error('Transaction not found — it may still be pending. Try again in a moment.');
    if (!receipt) throw new Error('Transaction receipt not found — it may still be pending.');
    if (receipt.status !== '0x1') throw new Error('Transaction failed or was reverted on-chain.');

    // Verify destination
    if (!tx.to || tx.to.toLowerCase() !== houseWallet) {
        throw new Error('Payment not sent to the house wallet.');
    }

    // Verify value (ETH, not an ERC-20 transfer)
    const valueWei = BigInt(tx.value);
    if (valueWei === 0n) throw new Error('Transaction value is zero — did you send an ERC-20 token instead of ETH?');

    const amountEth = Number(valueWei) / 1e18;
    const minEth = expectedEth * (1 - PRICE_TOLERANCE);

    if (amountEth < minEth) {
        throw new Error(
            `Insufficient amount: received ${amountEth.toFixed(8)} ETH, ` +
            `minimum required ${minEth.toFixed(8)} ETH.`
        );
    }

    // Recency check via block timestamp
    const block = await rpcCall('eth_getBlockByHash', [receipt.blockHash, false]);
    if (!block) throw new Error('Could not fetch block details.');
    const blockTime = parseInt(block.timestamp, 16);
    const age = Math.floor(Date.now() / 1000) - blockTime;
    if (age > MAX_AGE_SECONDS) throw new Error('Transaction is too old (must be within 2 hours).');

    return { amountEth, blockTime };
}

/**
 * Send ETH from the house wallet to a winner.
 * Requires HOUSE_PRIVATE_KEY_BASE to be set in the environment (hex, 0x-prefixed).
 */
async function sendEth(toAddress, amountEth) {
    const { ethers } = require('ethers');

    const provider = new ethers.JsonRpcProvider(getRpcUrl());
    const wallet = new ethers.Wallet(process.env.HOUSE_PRIVATE_KEY_BASE, provider);

    const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.parseEther(amountEth.toFixed(8)),
    });

    const receipt = await tx.wait();
    return receipt.hash;
}

module.exports = { verifyTransaction, sendEth };
