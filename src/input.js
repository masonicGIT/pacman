//////////////////////////////////////////////////////////////////////////////////////
// Input
// (Handles all key presses and touches)

(function(){

    // A Key Listener class (each key maps to an array of callbacks)
    var KeyEventListener = function() {
        this.listeners = {};
    };
    KeyEventListener.prototype = {
        add: function(key, callback, isActive) {
            this.listeners[key] = this.listeners[key] || [];
            this.listeners[key].push({
                isActive: isActive,
                callback: callback,
            });
        },
        exec: function(key, e) {
            var keyListeners = this.listeners[key];
            if (!keyListeners) {
                return;
            }
            var i,l;
            var numListeners = keyListeners.length;
            for (i=0; i<numListeners; i++) {
                l = keyListeners[i];
                if (!l.isActive || l.isActive()) {
                    e.preventDefault();
                    if (l.callback()) { // do not propagate keys if returns true
                        break;
                    }
                }
            }
        },
    };

    // declare key event listeners
    var keyDownListeners = new KeyEventListener();
    var keyUpListeners = new KeyEventListener();

    // helper functions for adding custom key listeners
    var addKeyDown = function(key,callback,isActive) { keyDownListeners.add(key,callback,isActive); };
    var addKeyUp   = function(key,callback,isActive) { keyUpListeners.add(key,callback,isActive); };

    // boolean states of each key
    var keyStates = {};

    // hook my key listeners to the window's listeners
    window.addEventListener("keydown", function(e) {
        var key = (e||window.event).keyCode;

        // only execute at first press event
        if (!keyStates[key]) {
            keyStates[key] = true;
            keyDownListeners.exec(key, e);
        }
    });
    window.addEventListener("keyup",function(e) {
        var key = (e||window.event).keyCode;

        keyStates[key] = false;
        keyUpListeners.exec(key, e);
    });


    // key enumerations

    var KEY_ENTER = 13;
    var KEY_ESC = 27;

    var KEY_LEFT = 37;
    var KEY_RIGHT = 39;
    var KEY_UP = 38;
    var KEY_DOWN = 40;

    var KEY_SHIFT = 16;
    var KEY_CTRL = 17;
    var KEY_ALT = 18;

    var KEY_SPACE = 32;

    var KEY_M = 77;
    var KEY_N = 78;
    var KEY_Q = 81;
    var KEY_W = 87;
    var KEY_E = 69;
    var KEY_R = 82;
    var KEY_T = 84;

    var KEY_A = 65;
    var KEY_S = 83;
    var KEY_D = 68;
    var KEY_F = 70;
    var KEY_G = 71;

    var KEY_I = 73;
    var KEY_O = 79;
    var KEY_P = 80;

    var KEY_1 = 49;
    var KEY_2 = 50;

    var KEY_END = 35;

    // Custom Key Listeners

    // Menu Navigation Keys
    var menu;
    var isInMenu = function() {
        menu = (state.getMenu && state.getMenu());
        if (!menu && inGameMenu.isOpen()) {
            menu = inGameMenu.getMenu();
        }
        return menu;
    };
    addKeyDown(KEY_ESC,   function(){ menu.backButton ? menu.backButton.onclick():0; return true; }, isInMenu);
    addKeyDown(KEY_ENTER, function(){ menu.clickCurrentOption(); }, isInMenu);
    var isMenuKeysAllowed = function() {
        var menu = isInMenu();
        return menu && !menu.noArrowKeys;
    };
    addKeyDown(KEY_UP,    function(){ menu.selectPrevOption(); }, isMenuKeysAllowed);
    addKeyDown(KEY_DOWN,  function(){ menu.selectNextOption(); }, isMenuKeysAllowed);
    var isInGameMenuButtonClickable = function() {
        return hud.isValidState() && !inGameMenu.isOpen();
    };
    addKeyDown(KEY_ESC, function() { inGameMenu.getMenuButton().onclick(); return true; }, isInGameMenuButtonClickable);

    // Move Pac-Man
    var isPlayState = function() { return state == learnState || state == newGameState || state == playState || state == readyNewState || state == readyRestartState; };
    addKeyDown(KEY_LEFT,  function() { pacman.setInputDir(DIR_LEFT); },  isPlayState);
    addKeyDown(KEY_RIGHT, function() { pacman.setInputDir(DIR_RIGHT); }, isPlayState);
    addKeyDown(KEY_UP,    function() { pacman.setInputDir(DIR_UP); },    isPlayState);
    addKeyDown(KEY_DOWN,  function() { pacman.setInputDir(DIR_DOWN); },  isPlayState);
    addKeyUp  (KEY_LEFT,  function() { pacman.clearInputDir(DIR_LEFT); },  isPlayState);
    addKeyUp  (KEY_RIGHT, function() { pacman.clearInputDir(DIR_RIGHT); }, isPlayState);
    addKeyUp  (KEY_UP,    function() { pacman.clearInputDir(DIR_UP); },    isPlayState);
    addKeyUp  (KEY_DOWN,  function() { pacman.clearInputDir(DIR_DOWN); },  isPlayState);

    // Slow-Motion
    var isPracticeMode = function() { return isPlayState() && practiceMode; };
    //isPracticeMode = function() { return true; };
    addKeyDown(KEY_1, function() { executive.setUpdatesPerSecond(30); }, isPracticeMode);
    addKeyDown(KEY_2,  function() { executive.setUpdatesPerSecond(15); }, isPracticeMode);
    addKeyUp  (KEY_1, function() { executive.setUpdatesPerSecond(60); }, isPracticeMode);
    addKeyUp  (KEY_2,  function() { executive.setUpdatesPerSecond(60); }, isPracticeMode);

    // Toggle VCR
    var canSeek = function() { return !isInMenu() && vcr.getMode() != VCR_NONE; };
    addKeyDown(KEY_SHIFT, function() { vcr.startSeeking(); },   canSeek);
    addKeyUp  (KEY_SHIFT, function() { vcr.startRecording(); }, canSeek);

    // Adjust VCR seeking
    var isSeekState = function() { return vcr.isSeeking(); };
    addKeyDown(KEY_UP,   function() { vcr.nextSpeed(1); },  isSeekState);
    addKeyDown(KEY_DOWN, function() { vcr.nextSpeed(-1); }, isSeekState);

    // Skip Level
    var canSkip = function() {
        return isPracticeMode() && 
            (state == newGameState ||
            state == readyNewState ||
            state == readyRestartState ||
            state == playState ||
            state == deadState ||
            state == finishState ||
            state == overState);
    };
    addKeyDown(KEY_N, function() { switchState(readyNewState, 60); }, canSkip);
    addKeyDown(KEY_M, function() { switchState(finishState); }, function() { return state == playState; });

    // Draw Actor Targets (fishpoles)
    addKeyDown(KEY_Q, function() { blinky.isDrawTarget = !blinky.isDrawTarget; }, isPracticeMode);
    addKeyDown(KEY_W, function() { pinky.isDrawTarget = !pinky.isDrawTarget; }, isPracticeMode);
    addKeyDown(KEY_E, function() { inky.isDrawTarget = !inky.isDrawTarget; }, isPracticeMode);
    addKeyDown(KEY_R, function() { clyde.isDrawTarget = !clyde.isDrawTarget; }, isPracticeMode);
    addKeyDown(KEY_T, function() { pacman.isDrawTarget = !pacman.isDrawTarget; }, isPracticeMode);

    // Draw Actor Paths
    addKeyDown(KEY_A, function() { blinky.isDrawPath = !blinky.isDrawPath; }, isPracticeMode);
    addKeyDown(KEY_S, function() { pinky.isDrawPath = !pinky.isDrawPath; }, isPracticeMode);
    addKeyDown(KEY_D, function() { inky.isDrawPath = !inky.isDrawPath; }, isPracticeMode);
    addKeyDown(KEY_F, function() { clyde.isDrawPath = !clyde.isDrawPath; }, isPracticeMode);
    addKeyDown(KEY_G, function() { pacman.isDrawPath = !pacman.isDrawPath; }, isPracticeMode);

    // Miscellaneous Cheats
    addKeyDown(KEY_I, function() { pacman.invincible = !pacman.invincible; }, isPracticeMode);
    addKeyDown(KEY_O, function() { turboMode = !turboMode; }, isPracticeMode);
    addKeyDown(KEY_P, function() { pacman.ai = !pacman.ai; }, isPracticeMode);

    addKeyDown(KEY_END, function() { executive.togglePause(); });

})();

var initSwipe = function() {

    // position of anchor
    var x = 0;
    var y = 0;

    // current distance from anchor
    var dx = 0;
    var dy = 0;

    // minimum distance from anchor before direction is registered
    var r = 4;
    
    var touchStart = function(event) {
        event.preventDefault();
        var fingerCount = event.touches.length;
        if (fingerCount == 1) {

            // commit new anchor
            x = event.touches[0].pageX;
            y = event.touches[0].pageY;

        }
        else {
            touchCancel(event);
        }
    };

    var touchMove = function(event) {
        event.preventDefault();
        var fingerCount = event.touches.length;
        if (fingerCount == 1) {

            // get current distance from anchor
            dx = event.touches[0].pageX - x;
            dy = event.touches[0].pageY - y;

            // if minimum move distance is reached
            if (dx*dx+dy*dy >= r*r) {

                // commit new anchor
                x += dx;
                y += dy;

                // register direction
                if (Math.abs(dx) >= Math.abs(dy)) {
                    pacman.setInputDir(dx>0 ? DIR_RIGHT : DIR_LEFT);
                }
                else {
                    pacman.setInputDir(dy>0 ? DIR_DOWN : DIR_UP);
                }
            }
        }
        else {
            touchCancel(event);
        }
    };

    var touchEnd = function(event) {
        event.preventDefault();
    };

    var touchCancel = function(event) {
        event.preventDefault();
        x=y=dx=dy=0;
    };

    var touchTap = function(event) {
        // tap to clear input directions
        pacman.clearInputDir(undefined);
    };
    
    // register touch events
    document.onclick = touchTap;
    document.ontouchstart = touchStart;
    document.ontouchend = touchEnd;
    document.ontouchmove = touchMove;
    document.ontouchcancel = touchCancel;
};
