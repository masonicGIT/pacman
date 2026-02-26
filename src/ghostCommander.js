//////////////////////////////////////////////////////////////////////////////////////
// Ghost Commander
// Determines when a ghost should be chasing a target

// modes representing the ghosts' current command
var GHOST_CMD_CHASE = 0;
var GHOST_CMD_SCATTER = 1;

var ghostCommander = (function() {

    // determine if there is to be a new command issued at the given time
    var getNewCommand = (function(){
        var t;
        var times = [{},{},{}];
        // level 1
        times[0][t=7*60] = GHOST_CMD_CHASE;
        times[0][t+=20*60] = GHOST_CMD_SCATTER;
        times[0][t+=7*60] = GHOST_CMD_CHASE;
        times[0][t+=20*60] = GHOST_CMD_SCATTER;
        times[0][t+=5*60] = GHOST_CMD_CHASE;
        times[0][t+=20*60] = GHOST_CMD_SCATTER;
        times[0][t+=5*60] = GHOST_CMD_CHASE;
        // level 2-4
        times[1][t=7*60] = GHOST_CMD_CHASE;
        times[1][t+=20*60] = GHOST_CMD_SCATTER;
        times[1][t+=7*60] = GHOST_CMD_CHASE;
        times[1][t+=20*60] = GHOST_CMD_SCATTER;
        times[1][t+=5*60] = GHOST_CMD_CHASE;
        times[1][t+=1033*60] = GHOST_CMD_SCATTER;
        times[1][t+=1] = GHOST_CMD_CHASE;
        // level 5+
        times[2][t=5*60] = GHOST_CMD_CHASE;
        times[2][t+=20*60] = GHOST_CMD_SCATTER;
        times[2][t+=5*60] = GHOST_CMD_CHASE;
        times[2][t+=20*60] = GHOST_CMD_SCATTER;
        times[2][t+=5*60] = GHOST_CMD_CHASE;
        times[2][t+=1037*60] = GHOST_CMD_SCATTER;
        times[2][t+=1] = GHOST_CMD_CHASE;

        return function(frame) {
            var i;
            if (level == 1)
                i = 0;
            else if (level >= 2 && level <= 4)
                i = 1;
            else
                i = 2;
            var newCmd = times[i][frame];

            if (gameMode == GAME_PACMAN) {
                return newCmd;
            }
            else if (frame <= 27*60) { // only revearse twice in Ms. Pac-Man (two happen in first 27 seconds)
                if (newCmd != undefined) {
                    return GHOST_CMD_CHASE; // always chase in Ms. Pac-Man mode
                }
            }
        };
    })();

    var frame;   // current frame
    var command; // last command given to ghosts

    var savedFrame = {};
    var savedCommand = {};

    // save state at time t
    var save = function(t) {
        savedFrame[t] = frame;
        savedCommand[t] = command;
    };

    // load state at time t
    var load = function(t) {
        frame = savedFrame[t];
        command = savedCommand[t];
    };

    return {
        save: save,
        load: load,
        reset: function() { 
            command = GHOST_CMD_SCATTER;
            frame = 0;
        },
        update: function() {
            var newCmd;
            if (!energizer.isActive()) {
                newCmd = getNewCommand(frame);
                if (newCmd != undefined) {
                    command = newCmd;
                    for (i=0; i<4; i++)
                        ghosts[i].reverse();
                }
                frame++;
            }
        },
        getCommand: function() {
            return command; 
        },
        setCommand: function(cmd) {
            command = cmd;
        },
    };
})();
