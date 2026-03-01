const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'pacman.db');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initDb() {
    const db = getDb();

    db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address      TEXT    NOT NULL,
            chain               TEXT    NOT NULL CHECK(chain IN ('solana','base')),
            tx_signature        TEXT    NOT NULL UNIQUE,
            amount_native       TEXT    NOT NULL,
            amount_usd          REAL    NOT NULL,
            price_at_payment    REAL    NOT NULL,
            session_token       TEXT    NOT NULL UNIQUE,
            session_used        INTEGER NOT NULL DEFAULT 0,
            score_submitted     INTEGER NOT NULL DEFAULT 0,
            created_at          INTEGER NOT NULL,
            day_key             TEXT    NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_payments_day  ON payments(day_key);
        CREATE INDEX IF NOT EXISTS idx_payments_tx   ON payments(tx_signature);
        CREATE INDEX IF NOT EXISTS idx_payments_tok  ON payments(session_token);

        CREATE TABLE IF NOT EXISTS scores (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            payment_id      INTEGER NOT NULL REFERENCES payments(id),
            wallet_address  TEXT    NOT NULL,
            chain           TEXT    NOT NULL,
            score           INTEGER NOT NULL,
            game_frames     INTEGER NOT NULL,
            game_mode       TEXT    NOT NULL,
            turbo_mode      INTEGER NOT NULL DEFAULT 0,
            submitted_at    INTEGER NOT NULL,
            day_key         TEXT    NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_scores_day   ON scores(day_key, score DESC);

        CREATE TABLE IF NOT EXISTS winners (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            day_key         TEXT    NOT NULL UNIQUE,
            wallet_address  TEXT    NOT NULL,
            chain           TEXT    NOT NULL,
            score           INTEGER NOT NULL,
            sol_pot         REAL    NOT NULL DEFAULT 0,
            eth_pot         REAL    NOT NULL DEFAULT 0,
            sol_prize       REAL    NOT NULL DEFAULT 0,
            eth_prize       REAL    NOT NULL DEFAULT 0,
            payout_status   TEXT    NOT NULL DEFAULT 'pending',
            notes           TEXT,
            created_at      INTEGER NOT NULL
        );
    `);

    console.log('[db] Database initialised at', DB_PATH);
}

module.exports = { getDb, initDb };
