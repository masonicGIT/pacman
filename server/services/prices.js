// Price feed service — caches SOL and ETH/USD prices for 5 minutes
// to avoid hammering the free CoinGecko API tier.

const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
const ENTRY_FEE_USD = 0.25;

const cache = {
    sol: { price: null, fetchedAt: 0 },
    eth: { price: null, fetchedAt: 0 },
};

async function fetchCoinGecko() {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum&vs_currencies=usd';
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('CoinGecko responded ' + res.status);
    return res.json();
}

async function getSolPrice() {
    const now = Date.now();
    if (cache.sol.price && now - cache.sol.fetchedAt < CACHE_TTL_MS) {
        return cache.sol.price;
    }
    const data = await fetchCoinGecko();
    const price = data.solana.usd;
    cache.sol = { price, fetchedAt: now };
    cache.eth = { price: data.ethereum.usd, fetchedAt: now };
    return price;
}

async function getEthPrice() {
    const now = Date.now();
    if (cache.eth.price && now - cache.eth.fetchedAt < CACHE_TTL_MS) {
        return cache.eth.price;
    }
    const data = await fetchCoinGecko();
    const price = data.ethereum.usd;
    cache.eth = { price, fetchedAt: now };
    cache.sol = { price: data.solana.usd, fetchedAt: now };
    return price;
}

// Returns amounts needed for a $0.25 entry fee on each chain
async function getPaymentAmounts() {
    const [solPrice, ethPrice] = await Promise.all([getSolPrice(), getEthPrice()]);
    return {
        sol: {
            price: solPrice,
            amount: ENTRY_FEE_USD / solPrice,
            amountStr: (ENTRY_FEE_USD / solPrice).toFixed(6),
        },
        eth: {
            price: ethPrice,
            amount: ENTRY_FEE_USD / ethPrice,
            amountStr: (ENTRY_FEE_USD / ethPrice).toFixed(8),
        },
    };
}

module.exports = { getSolPrice, getEthPrice, getPaymentAmounts, ENTRY_FEE_USD };
