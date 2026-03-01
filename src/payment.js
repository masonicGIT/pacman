//////////////////////////////////////////////////////////////////////////////////////
// Payment System
//
// Handles the 25¢ entry-fee gate, session tokens, and score submission.
// All UI is rendered as an HTML overlay styled to match the arcade aesthetic.
//
// Globals exposed to the rest of the bundle:
//   requirePayment(onPaid)            — call before starting a paid game
//   submitGameScore(score,frames,...) — call from overState.init()
//   gameStartTime                     — set in newGameState.init()

// ── Configuration ─────────────────────────────────────────────────────────────
// Auto-detect API origin.  In production change this to your server's URL.
var PAYMENT_API = (function () {
    var h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    // Assume the API server runs on port 3001 of the same host
    return window.location.protocol + '//' + h + ':3001';
}());

// ── Session storage helpers ───────────────────────────────────────────────────
var currentGameToken = null;
var gameStartTime    = 0;          // set by newGameState.init()

var _saveToken = function (token) {
    currentGameToken = token;
    try { sessionStorage.setItem('pmToken', token); } catch (e) {}
};

var _clearToken = function () {
    currentGameToken = null;
    try { sessionStorage.removeItem('pmToken'); } catch (e) {}
};

var _loadToken = function () {
    if (currentGameToken) return;
    try { currentGameToken = sessionStorage.getItem('pmToken') || null; } catch (e) {}
};

// ── Score submission ──────────────────────────────────────────────────────────
// Called from overState.init().  Silently no-ops if there is no active session
// (e.g. practice mode).
var submitGameScore = function (score, frames, gameModeName, isTurbo) {
    _loadToken();
    if (!currentGameToken) return;

    var token = currentGameToken;
    _clearToken();   // consumed — player must pay again for the next game

    fetch(PAYMENT_API + '/api/score/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token:    token,
            score:    score,
            frames:   frames,
            gameMode: gameModeName,
            turboMode: !!isTurbo,
        }),
    }).catch(function () { /* silent — score submission failure should not interrupt game-over */ });
};

// ── Payment gate ──────────────────────────────────────────────────────────────
// Call requirePayment(callback) instead of going directly to newGameState.
// If the player already holds a valid unused session token, proceeds immediately.
var requirePayment = function (onPaid) {
    _loadToken();

    if (currentGameToken) {
        // Validate the cached token with the server
        fetch(PAYMENT_API + '/api/payment/session/' + currentGameToken)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.valid) {
                    onPaid();
                } else {
                    _clearToken();
                    _paymentOverlay.show(onPaid);
                }
            })
            .catch(function () {
                // If server is unreachable, trust the cached token for one game
                onPaid();
            });
        return;
    }

    _paymentOverlay.show(onPaid);
};

// ── Payment overlay ───────────────────────────────────────────────────────────
var _paymentOverlay = (function () {

    var _el          = null;   // root overlay element
    var _onPaid      = null;   // callback fired when payment is verified
    var _chain       = null;   // 'solana' | 'base'
    var _info        = null;   // { solana, base } from /api/payment/info
    var _pot         = null;   // from /api/leaderboard

    // ── DOM helpers ──────────────────────────────────────────────────────────

    var _create = function () {
        if (_el) return;
        _el = document.createElement('div');
        _el.id = 'pm-overlay';
        _setStyles(_el, {
            display:        'none',
            position:       'fixed',
            top:            '0',
            left:           '0',
            width:          '100%',
            height:         '100%',
            background:     '#000',
            zIndex:         '1000',
            fontFamily:     'ArcadeR, monospace',
            color:          '#FFF',
            boxSizing:      'border-box',
            overflowY:      'auto',
            overflowX:      'hidden',
        });
        document.body.appendChild(_el);
    };

    var _setStyles = function (el, styles) {
        Object.keys(styles).forEach(function (k) { el.style[k] = styles[k]; });
    };

    var _render = function (html) { _el.innerHTML = html; };

    // ── HTML building blocks ─────────────────────────────────────────────────

    var _wrap = function (content) {
        return '<div style="display:flex;flex-direction:column;align-items:center;' +
               'justify-content:center;min-height:100vh;padding:24px 16px;' +
               'box-sizing:border-box">' + content + '</div>';
    };

    var _title = function (text, color) {
        return '<div style="font-size:16px;color:' + (color || '#FF0') + ';' +
               'margin-bottom:14px;text-align:center;letter-spacing:3px;' +
               'text-shadow:0 0 8px ' + (color || '#FF0') + '">' + text + '</div>';
    };

    var _line = function (text, color, size) {
        return '<div style="font-size:' + (size || '9') + 'px;color:' + (color || '#FFF') + ';' +
               'margin-bottom:6px;text-align:center;letter-spacing:1px">' + text + '</div>';
    };

    var _hr = function () {
        return '<div style="width:260px;height:1px;background:#222;margin:10px auto 12px"></div>';
    };

    var _btn = function (id, text, borderColor) {
        borderColor = borderColor || '#FF0';
        return '<button id="' + id + '" style="' +
               'display:block;width:200px;margin:6px auto;padding:8px 0;' +
               'background:#000;border:1px solid ' + borderColor + ';' +
               'color:' + borderColor + ';font-family:ArcadeR,monospace;' +
               'font-size:10px;letter-spacing:2px;cursor:pointer">' + text + '</button>';
    };

    var _smallBtn = function (id, text) {
        return '<button id="' + id + '" style="' +
               'display:inline-block;padding:2px 8px;background:#000;' +
               'border:1px solid #444;color:#888;font-family:ArcadeR,monospace;' +
               'font-size:8px;letter-spacing:1px;cursor:pointer;vertical-align:middle;' +
               'margin-left:6px">' + text + '</button>';
    };

    var _input = function (id, placeholder, width) {
        return '<input id="' + id + '" type="text" placeholder="' + placeholder + '" ' +
               'autocomplete="off" spellcheck="false" style="' +
               'display:block;width:' + (width || '260px') + ';margin:4px auto 10px;' +
               'padding:6px 8px;background:#111;border:1px solid #444;' +
               'color:#FFF;font-family:ArcadeR,monospace;font-size:8px;' +
               'letter-spacing:1px;box-sizing:border-box;outline:none">';
    };

    var _errDiv = function (id) {
        return '<div id="' + id + '" style="font-size:8px;color:#F00;text-align:center;' +
               'margin:2px 0 4px;min-height:12px;letter-spacing:1px"></div>';
    };

    var _setErr = function (id, msg) {
        var el = document.getElementById(id);
        if (el) el.textContent = msg;
    };

    var _q = function (id) { return document.getElementById(id); };
    var _on = function (id, fn) { var e = _q(id); if (e) e.onclick = fn; };

    // ── Screens ──────────────────────────────────────────────────────────────

    var _showLoading = function () {
        _render(_wrap(
            _title('INSERT COIN') +
            _line('LOADING...', '#555', 9)
        ));
    };

    var _showChainSelect = function () {
        var potLine = _pot
            ? '<div style="font-size:22px;color:#0FF;margin:4px 0;text-align:center;' +
              'letter-spacing:2px">$' + (_pot.pot.usdTotal || 0).toFixed(2) + '</div>'
            : _line('LOADING...', '#444');

        var leaderLine = (_pot && _pot.scores.length > 0)
            ? _line('TODAY\'S LEADER: ' + _pot.scores[0].score.toLocaleString(), '#0FF', 9)
            : '';

        _render(_wrap(
            _title('INSERT COIN') +
            _line('ENTRY FEE: $0.25 USD', '#FFF', 9) +
            _hr() +
            _line('TODAY\'S PRIZE POT', '#888', 8) +
            potLine +
            _line('WINNER TAKES 90%', '#555', 8) +
            leaderLine +
            _hr() +
            _line('SELECT PAYMENT NETWORK:', '#888', 8) +
            _btn('pm-btn-sol', 'SOLANA  (SOL)') +
            _btn('pm-btn-eth', 'BASE  (ETH)') +
            _hr() +
            _btn('pm-btn-cancel', 'CANCEL', '#555')
        ));

        _on('pm-btn-sol',    function () { _showPaymentDetails('solana'); });
        _on('pm-btn-eth',    function () { _showPaymentDetails('base'); });
        _on('pm-btn-cancel', function () { _hide(); });
    };

    var _showPaymentDetails = function (chain) {
        _chain = chain;
        if (!_info) { _setErr('pm-err', 'PRICE FEED UNAVAILABLE — TRY AGAIN'); return; }

        var chainInfo = chain === 'solana' ? _info.solana : _info.base;
        var label     = chain === 'solana' ? 'SOLANA' : 'BASE';
        var symbol    = chain === 'solana' ? 'SOL'    : 'ETH';
        var addr      = chainInfo.address;
        var short     = addr.slice(0, 8) + '...' + addr.slice(-6);

        _render(_wrap(
            _title(label + ' PAYMENT') +
            _line('SEND EXACTLY:', '#888', 8) +
            '<div style="font-size:20px;color:#FF0;margin:4px 0;text-align:center;letter-spacing:2px">' +
            chainInfo.amount + ' ' + symbol + '</div>' +
            _line('\u2248 $0.25 USD', '#555', 8) +
            _hr() +
            _line('TO THIS ADDRESS:', '#888', 8) +
            '<div style="font-size:9px;color:#0FF;text-align:center;word-break:break-all;' +
            'max-width:270px;margin:4px auto;letter-spacing:1px">' + short +
            _smallBtn('pm-btn-copy', 'COPY') + '</div>' +
            _hr() +
            _line('AFTER SENDING, CLICK NEXT', '#555', 8) +
            _btn('pm-btn-next', 'NEXT \u25b6') +
            _btn('pm-btn-back', 'BACK', '#555')
        ));

        _on('pm-btn-copy', function () {
            var copyBtn = _q('pm-btn-copy');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(addr)
                    .then(function () {
                        copyBtn.textContent = 'COPIED!';
                        setTimeout(function () {
                            if (_q('pm-btn-copy')) _q('pm-btn-copy').textContent = 'COPY';
                        }, 2000);
                    })
                    .catch(function () { prompt('Copy this address:', addr); });
            } else {
                prompt('Copy this address:', addr);
            }
        });

        _on('pm-btn-next', _showVerification);
        _on('pm-btn-back', _showChainSelect);
    };

    var _showVerification = function () {
        var txLabel = _chain === 'solana' ? 'TRANSACTION SIGNATURE' : 'TRANSACTION HASH (0x...)';
        var walletPlaceholder = _chain === 'solana' ? 'Your Solana wallet address...' : '0x...';
        var txPlaceholder     = _chain === 'solana' ? 'Transaction signature...'     : '0x...';

        _render(_wrap(
            _title('VERIFY PAYMENT') +
            _line('YOUR WALLET ADDRESS:', '#888', 8) +
            _input('pm-inp-wallet', walletPlaceholder) +
            _line(txLabel + ':', '#888', 8) +
            _input('pm-inp-tx', txPlaceholder) +
            _errDiv('pm-err') +
            _btn('pm-btn-verify', 'VERIFY \u0026 PLAY') +
            _btn('pm-btn-back', 'BACK', '#555')
        ));

        _q('pm-inp-wallet').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') _q('pm-inp-tx').focus();
        });
        _q('pm-inp-tx').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') _doVerify();
        });

        _on('pm-btn-verify', _doVerify);
        _on('pm-btn-back', function () { _showPaymentDetails(_chain); });
    };

    var _doVerify = function () {
        var wallet = (_q('pm-inp-wallet').value || '').trim();
        var txid   = (_q('pm-inp-tx').value   || '').trim();

        if (!wallet) { _setErr('pm-err', 'ENTER YOUR WALLET ADDRESS'); return; }
        if (!txid)   { _setErr('pm-err', 'ENTER YOUR TRANSACTION ID'); return; }

        if (_chain === 'solana' && wallet.length < 32) {
            _setErr('pm-err', 'INVALID SOLANA ADDRESS'); return;
        }
        if (_chain === 'base' && !/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
            _setErr('pm-err', 'INVALID BASE ADDRESS — MUST BE 0x + 40 HEX CHARS'); return;
        }

        _showVerifying();

        fetch(PAYMENT_API + '/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chain: _chain, txSignature: txid, walletAddress: wallet }),
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.token) {
                _saveToken(data.token);
                _showSuccess();
            } else {
                _showVerification();
                _setErr('pm-err', (data.error || 'VERIFICATION FAILED').toUpperCase());
            }
        })
        .catch(function () {
            _showVerification();
            _setErr('pm-err', 'SERVER UNREACHABLE \u2014 PLEASE TRY AGAIN');
        });
    };

    var _showVerifying = function () {
        _render(_wrap(
            _title('VERIFYING...', '#FFF') +
            _line('CHECKING BLOCKCHAIN', '#FF0', 10) +
            _line('THIS MAY TAKE A MOMENT', '#555', 8)
        ));
    };

    var _showSuccess = function () {
        var newPot = _pot ? '$' + ((_pot.pot.usdTotal || 0) + 0.25).toFixed(2) : '';

        _render(_wrap(
            _title('PAYMENT VERIFIED!', '#0F0') +
            _hr() +
            _line('GOOD LUCK!', '#FFF', 10) +
            _line('BEAT TODAY\'S HIGH SCORE', '#FF0', 9) +
            _line('TO WIN THE DAILY POT', '#FF0', 9) +
            (newPot ? '<div style="font-size:20px;color:#0FF;margin:8px 0;text-align:center">' + newPot + '</div>' : '') +
            _hr() +
            _line('STARTING GAME...', '#555', 8)
        ));

        setTimeout(function () {
            _hide();
            if (_onPaid) _onPaid();
        }, 2200);
    };

    // ── Public API ───────────────────────────────────────────────────────────

    var show = function (onPaid) {
        _onPaid = onPaid;
        _create();
        _el.style.display = 'block';
        _showLoading();

        var infoReady = false;
        var potReady  = false;

        var _tryRender = function () {
            if (infoReady && potReady) _showChainSelect();
        };

        fetch(PAYMENT_API + '/api/payment/info')
            .then(function (r) { return r.json(); })
            .then(function (data) { _info = data; })
            .catch(function () { _info = null; })
            .finally(function () { infoReady = true; _tryRender(); });

        fetch(PAYMENT_API + '/api/leaderboard')
            .then(function (r) { return r.json(); })
            .then(function (data) { _pot = data; })
            .catch(function () { _pot = null; })
            .finally(function () { potReady = true; _tryRender(); });
    };

    var _hide = function () {
        if (_el) _el.style.display = 'none';
    };

    return { show: show };
}());
