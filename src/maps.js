//////////////////////////////////////////////////////////////////////////////////////
// Maps

// Definitions of playable maps

// current map
var map;

// actor starting states

blinky.startDirEnum = DIR_LEFT;
blinky.startPixel = {
    x: 14*tileSize-1,
    y: 14*tileSize+midTile.y
};
blinky.cornerTile = {
    x: 28-1-2,
    y: 0
};
blinky.startMode = GHOST_OUTSIDE;
blinky.arriveHomeMode = GHOST_LEAVING_HOME;

pinky.startDirEnum = DIR_DOWN;
pinky.startPixel = {
    x: 14*tileSize-1,
    y: 17*tileSize+midTile.y,
};
pinky.cornerTile = {
    x: 2,
    y: 0
};
pinky.startMode = GHOST_PACING_HOME;
pinky.arriveHomeMode = GHOST_PACING_HOME;

inky.startDirEnum = DIR_UP;
inky.startPixel = {
    x: 12*tileSize-1,
    y: 17*tileSize + midTile.y,
};
inky.cornerTile = {
    x: 28-1,
    y: 36 - 2,
};
inky.startMode = GHOST_PACING_HOME;
inky.arriveHomeMode = GHOST_PACING_HOME;

clyde.startDirEnum = DIR_UP;
clyde.startPixel = {
    x: 16*tileSize-1,
    y: 17*tileSize + midTile.y,
};
clyde.cornerTile = {
    x: 0,
    y: 36-2,
};
clyde.startMode = GHOST_PACING_HOME;
clyde.arriveHomeMode = GHOST_PACING_HOME;

pacman.startDirEnum = DIR_LEFT;
pacman.startPixel = {
    x: 14*tileSize-1,
    y: 26*tileSize + midTile.y,
};

// Learning Map
var mapLearn = new Map(28, 36, (
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "__||||||||||||||||||||||||__" +
    "__|                      |__" +
    "__| ||||| |||||||| ||||| |__" +
    "__| ||||| |||||||| ||||| |__" +
    "__| ||    ||    ||    || |__" +
    "__| || || || || || || || |__" +
    "||| || || || || || || || |||" +
    "       ||    ||    ||       " +
    "||| ||||| |||||||| ||||| |||" +
    "__| ||||| |||||||| ||||| |__" +
    "__|    ||          ||    |__" +
    "__| || || |||||||| || || |__" +
    "__| || || |||||||| || || |__" +
    "__| ||    ||    ||    || |__" +
    "__| || || || || || || || |__" +
    "||| || || || || || || || |||" +
    "       ||    ||    ||       " +
    "||| |||||||| || |||||||| |||" +
    "__| |||||||| || |||||||| |__" +
    "__|                      |__" +
    "__||||||||||||||||||||||||__" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "____________________________"));

mapLearn.name = "Pac-Man";
mapLearn.wallStrokeColor = "#47b897"; // from Pac-Man Plus
mapLearn.wallFillColor = "#000";
mapLearn.pelletColor = "#ffb8ae";
mapLearn.shouldDrawMapOnly = true;

// Original Pac-Man map
var mapPacman = new Map(28, 36, (
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "||||||||||||||||||||||||||||" +
    "|............||............|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|o||||.|||||.||.|||||.||||o|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|..........................|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|......||....||....||......|" +
    "||||||.||||| || |||||.||||||" +
    "_____|.||||| || |||||.|_____" +
    "_____|.||          ||.|_____" +
    "_____|.|| |||--||| ||.|_____" +
    "||||||.|| |______| ||.||||||" +
    "      .   |______|   .      " +
    "||||||.|| |______| ||.||||||" +
    "_____|.|| |||||||| ||.|_____" +
    "_____|.||          ||.|_____" +
    "_____|.|| |||||||| ||.|_____" +
    "||||||.|| |||||||| ||.||||||" +
    "|............||............|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|o..||.......  .......||..o|" +
    "|||.||.||.||||||||.||.||.|||" +
    "|||.||.||.||||||||.||.||.|||" +
    "|......||....||....||......|" +
    "|.||||||||||.||.||||||||||.|" +
    "|.||||||||||.||.||||||||||.|" +
    "|..........................|" +
    "||||||||||||||||||||||||||||" +
    "____________________________" +
    "____________________________"));

mapPacman.name = "Pac-Man";
//mapPacman.wallStrokeColor = "#47b897"; // from Pac-Man Plus
mapPacman.wallStrokeColor = "#2121ff"; // from original
mapPacman.wallFillColor = "#000";
mapPacman.pelletColor = "#ffb8ae";
mapPacman.constrainGhostTurns = function(tile,openTiles) {
    // prevent ghost from turning up at these tiles
    if ((tile.x == 12 || tile.x == 15) && (tile.y == 14 || tile.y == 26)) {
        openTiles[DIR_UP] = false;
    }
};

// Levels are grouped into "acts."
// In Ms. Pac-Man (and Cookie-Man) a map only changes after the end of an act.
// The levels within an act progress in difficulty.
// But the beginning of an act is generally easier than the end of the previous act to stave frustration.
// Completing an act results in a cutscene.
var getLevelAct = function(level) {
    // Act 1: (levels 1,2)
    // Act 2: (levels 3,4,5)
    // Act 3: (levels 6,7,8,9)
    // Act 4: (levels 10,11,12,13)
    // Act 5: (levels 14,15,16,17)
    // ...
    if (level <= 2) {
        return 1;
    }
    else if (level <= 5) {
        return 2;
    }
    else {
        return 3 + Math.floor((level - 6)/4);
    }
};

var getActColor = function(act) {
    if (gameMode == GAME_PACMAN) {
        return {
            wallFillColor: mapPacman.wallFillColor,
            wallStrokeColor: mapPacman.wallStrokeColor,
            pelletColor: mapPacman.pelletColor,
        };
    }
    else if (gameMode == GAME_MSPACMAN || gameMode == GAME_OTTO) {
        return getMsPacActColor(act);
    }
    else if (gameMode == GAME_COOKIE) {
        return getCookieActColor(act);
    }
};

var getActRange = function(act) {
    if (act == 1) {
        return [1,2];
    }
    else if (act == 2) {
        return [3,5];
    }
    else {
        var start = act*4-6;
        return [start, start+3];
    }
};

var getCookieActColor = function(act) {
    var colors = [
        "#359c9c", "#80d8fc", // turqoise
        "#c2b853", "#e6f1e7", // yellow
        "#86669c", "#f2c1db", // purple
        "#ed0a04", "#e8b4cd", // red
        "#2067c1", "#63e0b6", // blue
        "#c55994", "#fd61c3", // pink
        "#12bc76", "#b4e671", // green
        "#5036d9", "#618dd4", // violet
        "#939473", "#fdfdf4", // grey
    ];
    var i = ((act-1)*2) % colors.length;
    return {
        wallFillColor: colors[i],
        wallStrokeColor: colors[i+1],
        pelletColor: "#ffb8ae",
    };
};

var setNextCookieMap = function() {
    // cycle the colors
    var i;
    var act = getLevelAct(level);
    if (!map || level == 1 || act != getLevelAct(level-1)) {
        map = mapgen();
        var colors = getCookieActColor(act);
        map.wallFillColor = colors.wallFillColor;
        map.wallStrokeColor = colors.wallStrokeColor;
        map.pelletColor = colors.pelletColor;
    }
};

// Ms. Pac-Man map 1

var getMsPacActColor = function(act) {
    act -= 1;
    var mapIndex = (act <= 1) ? act : (act%2)+2;
    var maps = [mapMsPacman1, mapMsPacman2, mapMsPacman3, mapMsPacman4];
    var map = maps[mapIndex];
    if (act >= 4) {
        return [
            {
                wallFillColor: "#ffb8ff",
                wallStrokeColor: "#FFFF00",
                pelletColor: "#00ffff",
            },
            {
                wallFillColor: "#FFB8AE",
                wallStrokeColor: "#FF0000",
                pelletColor: "#dedeff",
            },
            {
                wallFillColor: "#de9751",
                wallStrokeColor: "#dedeff",
                pelletColor: "#ff0000",
            },
            {
                wallFillColor: "#2121ff",
                wallStrokeColor: "#ffb851",
                pelletColor: "#dedeff",
            },
        ][act%4];
    }
    else {
        return {
            wallFillColor: map.wallFillColor,
            wallStrokeColor: map.wallStrokeColor,
            pelletColor: map.pelletColor,
        };
    }
};

var setNextMsPacMap = function() {
    var maps = [mapMsPacman1, mapMsPacman2, mapMsPacman3, mapMsPacman4];

    // The third and fourth maps repeat indefinitely after the second map.
    // (i.e. act1=map1, act2=map2, act3=map3, act4=map4, act5=map3, act6=map4, ...)
    var act = getLevelAct(level)-1;
    var mapIndex = (act <= 1) ? act : (act%2)+2;
    map = maps[mapIndex];
    if (act >= 4) {
        var colors = getMsPacActColor(act+1);
        map.wallFillColor = colors.wallFillColor;
        map.wallStrokeColor = colors.wallStrokeColor;
        map.pelletColor = colors.pelletColor;
    }
};

var mapMsPacman1 = new Map(28, 36, (
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "||||||||||||||||||||||||||||" +
    "|......||..........||......|" +
    "|o||||.||.||||||||.||.||||o|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|..........................|" +
    "|||.||.|||||.||.|||||.||.|||" +
    "__|.||.|||||.||.|||||.||.|__" +
    "|||.||.|||||.||.|||||.||.|||" +
    "   .||.......||.......||.   " +
    "|||.||||| |||||||| |||||.|||" +
    "__|.||||| |||||||| |||||.|__" +
    "__|.                    .|__" +
    "__|.||||| |||--||| |||||.|__" +
    "__|.||||| |______| |||||.|__" +
    "__|.||    |______|    ||.|__" +
    "__|.|| || |______| || ||.|__" +
    "|||.|| || |||||||| || ||.|||" +
    "   .   ||          ||   .   " +
    "|||.|||||||| || ||||||||.|||" +
    "__|.|||||||| || ||||||||.|__" +
    "__|.......   ||   .......|__" +
    "__|.|||||.||||||||.|||||.|__" +
    "|||.|||||.||||||||.|||||.|||" +
    "|............  ............|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|.||||.||....||....||.||||.|" +
    "|o||||.||.||||||||.||.||||o|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|..........................|" +
    "||||||||||||||||||||||||||||" +
    "____________________________" +
    "____________________________"));

mapMsPacman1.name = "Ms. Pac-Man 1";
mapMsPacman1.wallFillColor = "#FFB8AE";
mapMsPacman1.wallStrokeColor = "#FF0000";
mapMsPacman1.pelletColor = "#dedeff";
mapMsPacman1.fruitPaths = {
             "entrances": [
                 { "start": { "y": 164, "x": 228 }, "path": "<<<<vvv<<<<<<<<<^^^" }, 
                 { "start": { "y": 164, "x": -4 }, "path": ">>>>vvvvvv>>>>>>>>>>>>>>>^^^<<<^^^" }, 
                 { "start": { "y": 92, "x": -4 }, "path": ">>>>^^^^>>>vvvv>>>vvv>>>>>>>>>vvvvvv<<<" }, 
                 { "start": { "y": 92, "x": 228 }, "path": "<<<<vvvvvvvvv<<<^^^<<<vvv<<<" }
             ], 
             "exits": [
                 { "path": "<vvv>>>>>>>>>^^^>>>>" }, 
                 { "path": "<<<<vvv<<<<<<<<<^^^<<<<" }, 
                 { "path": "<<<<<<<^^^^^^<<<<<<^^^<<<<" }, 
                 { "path": "<vvv>>>>>>>>>^^^^^^^^^^^^>>>>" }
             ]
         };

// Ms. Pac-Man map 2

var mapMsPacman2 = new Map(28, 36, (
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "||||||||||||||||||||||||||||" +
    "       ||..........||       " +
    "|||||| ||.||||||||.|| ||||||" +
    "|||||| ||.||||||||.|| ||||||" +
    "|o...........||...........o|" +
    "|.|||||||.||.||.||.|||||||.|" +
    "|.|||||||.||.||.||.|||||||.|" +
    "|.||......||.||.||......||.|" +
    "|.||.|||| ||....|| ||||.||.|" +
    "|.||.|||| |||||||| ||||.||.|" +
    "|......|| |||||||| ||......|" +
    "||||||.||          ||.||||||" +
    "||||||.|| |||--||| ||.||||||" +
    "|......|| |______| ||......|" +
    "|.||||.|| |______| ||.||||.|" +
    "|.||||.   |______|   .||||.|" +
    "|...||.|| |||||||| ||.||...|" +
    "|||.||.||          ||.||.|||" +
    "__|.||.|||| |||| ||||.||.|__" +
    "__|.||.|||| |||| ||||.||.|__" +
    "__|.........||||.........|__" +
    "__|.|||||||.||||.|||||||.|__" +
    "|||.|||||||.||||.|||||||.|||" +
    "   ....||...    ...||....   " +
    "|||.||.||.||||||||.||.||.|||" +
    "|||.||.||.||||||||.||.||.|||" +
    "|o..||.......||.......||..o|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|..........................|" +
    "||||||||||||||||||||||||||||" +
    "____________________________" +
    "____________________________"));

mapMsPacman2.name = "Ms. Pac-Man 2";
mapMsPacman2.wallFillColor = "#47b8ff";
mapMsPacman2.wallStrokeColor = "#dedeff";
mapMsPacman2.pelletColor = "#ffff00";
mapMsPacman2.fruitPaths = {
             "entrances": [
                 { "start": { "y": 212, "x": 228 }, "path": "<<<<^^^<<<<<<<<^^^<" }, 
                 { "start": { "y": 212, "x": -4 }, "path": ">>>>^^^>>>>>>>>vvv>>>>>^^^^^^<" }, 
                 { "start": { "y": 36, "x": -4 }, "path": ">>>>>>>vvv>>>vvvvvvv>>>>>>>>>vvvvvv<<<" }, 
                 { "start": { "y": 36, "x": 228 }, "path": "<<<<<<<vvv<<<vvvvvvvvvvvvv<<<" }
             ], 
             "exits": [
                 { "path": "vvv>>>>>>>>vvv>>>>" }, 
                 { "path": "vvvvvv<<<<<^^^<<<<<<<<vvv<<<<" }, 
                 { "path": "<<<<<<<^^^^^^^^^^^^^<<<^^^<<<<<<<" }, 
                 { "path": "vvv>>>>>^^^^^^^^^^>>>>>^^^^^^<<<<<^^^>>>>>>>" }
             ]
         };

// Ms. Pac-Man map 3

var mapMsPacman3 = new Map(28, 36, (
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "||||||||||||||||||||||||||||" +
    "|.........||....||.........|" +
    "|.|||||||.||.||.||.|||||||.|" +
    "|o|||||||.||.||.||.|||||||o|" +
    "|.||.........||.........||.|" +
    "|.||.||.||||.||.||||.||.||.|" +
    "|....||.||||.||.||||.||....|" +
    "||||.||.||||.||.||||.||.||||" +
    "||||.||..............||.||||" +
    " ....|||| |||||||| ||||.... " +
    "|.|| |||| |||||||| |||| ||.|" +
    "|.||                    ||.|" +
    "|.|||| || |||--||| || ||||.|" +
    "|.|||| || |______| || ||||.|" +
    "|.     || |______| ||     .|" +
    "|.|| |||| |______| |||| ||.|" +
    "|.|| |||| |||||||| |||| ||.|" +
    "|.||                    ||.|" +
    "|.|||| ||||| || ||||| ||||.|" +
    "|.|||| ||||| || ||||| ||||.|" +
    "|......||....||....||......|" +
    "|||.||.||.||||||||.||.||.|||" +
    "|||.||.||.||||||||.||.||.|||" +
    "|o..||.......  .......||..o|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|.||||.|||||.||.|||||.||||.|" +
    "|......||....||....||......|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|......||..........||......|" +
    "||||||||||||||||||||||||||||" +
    "____________________________" +
    "____________________________"));

mapMsPacman3.name = "Ms. Pac-Man 3";
mapMsPacman3.wallFillColor = "#de9751";
mapMsPacman3.wallStrokeColor = "#dedeff";
mapMsPacman3.pelletColor = "#ff0000";
mapMsPacman3.fruitPaths = {
             "entrances": [
                 { "start": { "y": 100, "x": 228 }, "path": "<<<<<vv<<<<<vvvvvv<<<" }, 
                 { "start": { "y": 100, "x": -4 }, "path": ">>>>>vv>>>>>>>>>>>>>>vvvvvv<<<" }, 
                 { "start": { "y": 100, "x": -4 }, "path": ">>>>>vv>>>>>>>>>>>>>>vvvvvv<<<" }, 
                 { "start": { "y": 100, "x": 228 }, "path": "<<vvvvv<<<vvv<<<<<<<<" }
             ], 
             "exits": [
                 { "path": "<vvv>>>vvv>>>^^^>>>>>^^^^^^^^^^^>>" }, 
                 { "path": "<<<<vvv<<<vvv<<<^^^<<<<<^^^^^^^^^^^<<" }, 
                 { "path": "<<<<vvv<<<vvv<<<^^^<<<<<^^^^^^^^^^^<<" }, 
                 { "path": "<vvv>>>vvv>>>^^^^^^<<<^^^^^^>>>>>^^>>>>>" }
             ]
         };
mapMsPacman3.constrainGhostTurns = function(tile,openTiles,dirEnum) {
    // prevent ghost from turning down when exiting tunnels
    if (tile.y == 12) {
        if ((tile.x == 1 && dirEnum == DIR_RIGHT) || (tile.x == 26 && dirEnum == DIR_LEFT)) {
            openTiles[DIR_DOWN] = false;
        }
    }
};

// Ms. Pac-Man map 4

var mapMsPacman4 = new Map(28, 36, (
    "____________________________" +
    "____________________________" +
    "____________________________" +
    "||||||||||||||||||||||||||||" +
    "|..........................|" +
    "|.||.||||.||||||||.||||.||.|" +
    "|o||.||||.||||||||.||||.||o|" +
    "|.||.||||.||....||.||||.||.|" +
    "|.||......||.||.||......||.|" +
    "|.||||.||.||.||.||.||.||||.|" +
    "|.||||.||.||.||.||.||.||||.|" +
    "|......||....||....||......|" +
    "|||.|||||||| || ||||||||.|||" +
    "__|.|||||||| || ||||||||.|__" +
    "__|....||          ||....|__" +
    "||| ||.|| |||--||| ||.|| |||" +
    "    ||.|| |______| ||.||    " +
    "||||||.   |______|   .||||||" +
    "||||||.|| |______| ||.||||||" +
    "    ||.|| |||||||| ||.||    " +
    "||| ||.||          ||.|| |||" +
    "__|....||||| || |||||....|__" +
    "__|.||.||||| || |||||.||.|__" +
    "__|.||....   ||   ....||.|__" +
    "__|.|||||.|| || ||.|||||.|__" +
    "|||.|||||.|| || ||.|||||.|||" +
    "|.........||    ||.........|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|.||||.||.||||||||.||.||||.|" +
    "|.||...||..........||...||.|" +
    "|o||.|||||||.||.|||||||.||o|" +
    "|.||.|||||||.||.|||||||.||.|" +
    "|............||............|" +
    "||||||||||||||||||||||||||||" +
    "____________________________" +
    "____________________________"));

mapMsPacman4.name = "Ms. Pac-Man 4";
mapMsPacman4.wallFillColor = "#2121ff";
mapMsPacman4.wallStrokeColor = "#ffb851";
mapMsPacman4.pelletColor = "#dedeff";
mapMsPacman4.fruitPaths = {
             "entrances": [
                 { "start": { "y": 156, "x": 228 }, "path": "<<<<vv<<<vv<<<<<<^^^" }, 
                 { "start": { "y": 156, "x": -4 }, "path": ">>>>vv>>>vv>>>>>>vvv>>>^^^^^^" }, 
                 { "start": { "y": 132, "x": -4 }, "path": ">>>>^^^^^>>>^^^>>>vvv>>>vvv>>>>>>vvvvvv<<<" }, 
                 { "start": { "y": 132, "x": 228 }, "path": "<<<<^^<<<vvv<<<vvv<<<" }
             ], 
             "exits": [
                 { "path": "<vvv>>>>>>^^>>>^^>>>>" }, 
                 { "path": "<<<<vvv<<<<<<^^<<<^^<<<<" }, 
                 { "path": "<<<<<<<^^^<<<^^^<<<vv<<<<" }, 
                 { "path": "<vvv>>>>>>^^^^^^^^^>>>vv>>>>" }
             ]
         };
