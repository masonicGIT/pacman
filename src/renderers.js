//////////////////////////////////////////////////////////////
// Renderers

// Draws everything in the game using swappable renderers
// to enable to different front-end displays for Pac-Man.

// list of available renderers
var renderer_list;

// current renderer
var renderer;

var renderScale;

var mapMargin = 4*tileSize; // margin between the map and the screen
var mapPad = tileSize/8; // padding between the map and its clipping

var mapWidth = 28*tileSize+mapPad*2;
var mapHeight = 36*tileSize+mapPad*2;

var screenWidth = mapWidth+mapMargin*2;
var screenHeight = mapHeight+mapMargin*2;

// all rendering will be shown on this canvas
var canvas;

// switch to the given renderer index
var switchRenderer = function(i) {
    renderer = renderer_list[i];
    renderer.drawMap();
};

var getDevicePixelRatio = function() {
    // Only consider the device pixel ratio for devices that are <= 320 pixels in width.
    // This is necessary for the iPhone4's retina display; otherwise the game would be blurry.
    // The iPad3's retina display @ 2048x1536 starts slowing the game down.
    return 1;
    if (window.innerWidth <= 320) {
        return window.devicePixelRatio || 1;
    }
    return 1;
};

var initRenderer = function(){

    var bgCanvas;
    var ctx, bgCtx;

    // drawing scale
    var scale = 2;        // scale everything by this amount

    // (temporary global version of scale just to get things quickly working)
    renderScale = scale; 

    var resets = 0;

    // rescale the canvases
    var resetCanvasSizes = function() {

        // set the size of the canvas in actual pixels
        canvas.width = screenWidth * scale;
        canvas.height = screenHeight * scale;

        // set the size of the canvas in browser pixels
        var ratio = getDevicePixelRatio();
        canvas.style.width = canvas.width / ratio;
        canvas.style.height = canvas.height / ratio;

        if (resets > 0) {
            ctx.restore();
        }
        ctx.save();
        ctx.scale(scale,scale);

        bgCanvas.width = mapWidth * scale;
        bgCanvas.height = mapHeight * scale;
        if (resets > 0) {
            bgCtx.restore();
        }
        bgCtx.save();
        bgCtx.scale(scale,scale);

        resets++;
    };

    // get the target scale that will cause the canvas to fit the window
    var getTargetScale = function() {
        var sx = (window.innerWidth - 10) / screenWidth;
        var sy = (window.innerHeight - 10) / screenHeight;
        var s = Math.min(sx,sy);
        s *= getDevicePixelRatio();
        return s;
    };

    // maximize the scale to fit the window
    var fullscreen = function() {
        // NOTE: css-scaling alternative at https://gist.github.com/1184900
        renderScale = scale = getTargetScale();
        resetCanvasSizes();
        atlas.create();
        if (renderer) {
            renderer.drawMap();
        }
        center();
    };

    // center the canvas in the window
    var center = function() {
        var s = getTargetScale()/getDevicePixelRatio();
        var w = screenWidth*s;
        var x = Math.max(0,(window.innerWidth-10)/2 - w/2);
        var y = 0;
        /*
        canvas.style.position = "absolute";
        canvas.style.left = x;
        canvas.style.top = y;
        console.log(canvas.style.left);
        */
        document.body.style.marginLeft = (window.innerWidth - w)/2 + "px";
    };

    // create foreground and background canvases
    canvas = document.getElementById('canvas');
    bgCanvas = document.createElement('canvas');
    ctx = canvas.getContext("2d");
    bgCtx = bgCanvas.getContext("2d");

    // initialize placement and size
    fullscreen();

    // adapt placement and size to window resizes
    var resizeTimeout;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(fullscreen, 100);
    }, false);

    //////////////////////

    var beginMapFrame = function() {
        bgCtx.fillStyle = "#000";
        bgCtx.fillRect(0,0,mapWidth,mapHeight);
        bgCtx.translate(mapPad, mapPad);
    };

    var endMapFrame = function() {
        bgCtx.translate(-mapPad, -mapPad);
    };

    //////////////////////////////////////////////////////////////
    // Common Renderer
    // (attributes and functionality that are currently common to all renderers)

    // constructor
    var CommonRenderer = function() {
        this.actorSize = (tileSize-1)*2;
        this.energizerSize = tileSize+2;
        this.pointsEarnedTextSize = tileSize;

        this.energizerColor = "#FFF";
        this.pelletColor = "#888";

        this.flashLevel = false;
    };

    CommonRenderer.prototype = {

        setOverlayColor: function(color) {
            this.overlayColor = color;
        },

        beginMapClip: function() {
            ctx.save();
            ctx.beginPath();

            // subtract one from size due to shift done for sprite realignment?
            // (this fixes a bug that leaves unerased artifacts after actors use right-side tunnel
            ctx.rect(-mapPad,-mapPad,mapWidth-1,mapHeight-1); 

            ctx.clip();
        },

        endMapClip: function() {
            ctx.restore();
        },

        beginFrame: function() {
            this.setOverlayColor(undefined);
            ctx.save();

            // clear margin area
            ctx.fillStyle = "#000";
            (function(w,h,p){
                ctx.fillRect(0,0,w,p+1);
                ctx.fillRect(0,p,p,h-2*p);
                ctx.fillRect(w-p-2,p,p+2,h-2*p);
                ctx.fillRect(0,h-p-2,w,p+2);
            })(screenWidth, screenHeight, mapMargin);

            // draw fps
            if (DEBUG) {
                ctx.font = (tileSize-2) + "px ArcadeR";
                ctx.textBaseline = "bottom";
                ctx.textAlign = "right";
                ctx.fillStyle = "#333";
                ctx.fillText(Math.floor(executive.getFps())+" FPS", screenWidth, screenHeight);
            }

            // translate to map space
            ctx.translate(mapMargin+mapPad, mapMargin+mapPad);
        },

        endFrame: function() {
            ctx.restore();
            if (this.overlayColor != undefined) {
                ctx.fillStyle = this.overlayColor;
                ctx.fillRect(0,0,screenWidth,screenHeight);
            }
        },

        clearMapFrame: function() {
            ctx.fillStyle = "#000";
            ctx.fillRect(-1,-1,mapWidth+1,mapHeight+1);
        },

        renderFunc: function(f,that) {
            if (that) {
                f.call(that,ctx);
            }
            else {
                f(ctx);
            }
        },

        // scaling the canvas can incur floating point roundoff errors
        // which manifest as "grout" between tiles that are otherwise adjacent in integer-space
        // This function extends the width and height of the tile if it is adjacent to equivalent tiles
        // that are to the bottom or right of the given tile
        drawNoGroutTile: function(ctx,x,y,w) {
            var tileChar = map.getTile(x,y);
            this.drawCenterTileSq(ctx,x,y,tileSize,
                    map.getTile(x+1,y) == tileChar,
                    map.getTile(x,y+1) == tileChar,
                    map.getTile(x+1,y+1) == tileChar);
        },

        // draw square centered at the given tile with optional "floating point grout" filling
        drawCenterTileSq: function (ctx,tx,ty,w, rightGrout, downGrout, downRightGrout) {
            this.drawCenterPixelSq(ctx, tx*tileSize+midTile.x, ty*tileSize+midTile.y,w,
                    rightGrout, downGrout, downRightGrout);
        },

        // draw square centered at the given pixel
        drawCenterPixelSq: function (ctx,px,py,w,rightGrout, downGrout, downRightGrout) {
            ctx.fillRect(px-w/2, py-w/2,w,w);

            // fill "floating point grout" gaps between tiles
            var gap = 1;
            if (rightGrout) ctx.fillRect(px-w/2, py-w/2,w+gap,w);
            if (downGrout) ctx.fillRect(px-w/2, py-w/2,w,w+gap);
            //if (rightGrout && downGrout && downRightGrout) ctx.fillRect(px-w/2, py-w/2,w+gap,w+gap);
        },

        // this flag is used to flash the level upon its successful completion
        toggleLevelFlash: function () {
            this.flashLevel = !this.flashLevel;
        },

        setLevelFlash: function(on) {
            if (on != this.flashLevel) {
                this.flashLevel = on;
                this.drawMap();
            }
        },

        // draw the target visualizers for each actor
        drawTargets: function() {
            var i;
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = "1.5";
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            for (i=0;i<5;i++)
                if (actors[i].isDrawTarget)
                    actors[i].drawTarget(ctx);
        },

        drawPaths: function() {
            var backupAlpha = ctx.globalAlpha;
            ctx.globalAlpha = 0.7;
            var i;
            for (i=0;i<5;i++)
                if (actors[i].isDrawPath)
                    this.drawPath(actors[i]);
            ctx.globalAlpha = backupAlpha;
        },

        // draw a predicted path for the actor if it continues pursuing current target
        drawPath: function(actor) {
            if (!actor.targetting) return;

            // current state of the predicted path
            var tile = { x: actor.tile.x, y: actor.tile.y};
            var target = actor.targetTile;
            var dir = { x: actor.dir.x, y: actor.dir.y };
            var dirEnum = actor.dirEnum;
            var openTiles;

            // exit if we're already on the target
            if (tile.x == target.x && tile.y == target.y) {
                return;
            }

            // if we are past the center of the tile, we cannot turn here anymore, so jump to next tile
            if ((dirEnum == DIR_UP && actor.tilePixel.y <= midTile.y) ||
                (dirEnum == DIR_DOWN && actor.tilePixel.y >= midTile.y) ||
                (dirEnum == DIR_LEFT && actor.tilePixel.x <= midTile.x) ||
                (dirEnum == DIR_RIGHT & actor.tilePixel.x >= midTile.x)) {
                tile.x += dir.x;
                tile.y += dir.y;
            }
            var pixel = { x:tile.x*tileSize+midTile.x, y:tile.y*tileSize+midTile.y };
            
            // dist keeps track of how far we're going along this path, stopping at maxDist
            // distLeft determines how long the last line should be
            var dist = Math.abs(tile.x*tileSize+midTile.x - actor.pixel.x + tile.y*tileSize+midTile.y - actor.pixel.y);
            var maxDist = actorPathLength*tileSize;
            var distLeft;
            
            // add the first line
            ctx.strokeStyle = actor.pathColor;
            ctx.lineWidth = "2.0";
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(
                    actor.pixel.x+actor.pathCenter.x,
                    actor.pixel.y+actor.pathCenter.y);
            ctx.lineTo(
                    pixel.x+actor.pathCenter.x,
                    pixel.y+actor.pathCenter.y);

            if (tile.x == target.x && tile.y == target.y) {
                // adjust the distance left to create a smoothly interpolated path end
                distLeft = actor.getPathDistLeft(pixel, dirEnum);
            }
            else while (true) {

                // predict next turn from current tile
                openTiles = getOpenTiles(tile, dirEnum);
                if (actor != pacman && map.constrainGhostTurns)
                    map.constrainGhostTurns(tile, openTiles, dirEnum);
                dirEnum = getTurnClosestToTarget(tile, target, openTiles);
                setDirFromEnum(dir,dirEnum);
                
                // if the next tile is our target, determine how mush distance is left and break loop
                if (tile.x+dir.x == target.x && tile.y+dir.y == target.y) {
                
                    // adjust the distance left to create a smoothly interpolated path end
                    distLeft = actor.getPathDistLeft(pixel, dirEnum);

                    // cap distance left
                    distLeft = Math.min(maxDist-dist, distLeft);

                    break;
                }
                
                // exit if we're going past the max distance
                if (dist + tileSize > maxDist) {
                    distLeft = maxDist - dist;
                    break;
                }

                // move to next tile and add a line to its center
                tile.x += dir.x;
                tile.y += dir.y;
                pixel.x += tileSize*dir.x;
                pixel.y += tileSize*dir.y;
                dist += tileSize;
                ctx.lineTo(
                        tile.x*tileSize+midTile.x+actor.pathCenter.x,
                        tile.y*tileSize+midTile.y+actor.pathCenter.y);
            }

            // calculate final endpoint
            var px = pixel.x+actor.pathCenter.x+distLeft*dir.x;
            var py = pixel.y+actor.pathCenter.y+distLeft*dir.y;

            // add an arrow head
            ctx.lineTo(px,py);
            var s = 3;
            if (dirEnum == DIR_LEFT || dirEnum == DIR_RIGHT) {
                ctx.lineTo(px-s*dir.x,py+s*dir.x);
                ctx.moveTo(px,py);
                ctx.lineTo(px-s*dir.x,py-s*dir.x);
            }
            else {
                ctx.lineTo(px+s*dir.y,py-s*dir.y);
                ctx.moveTo(px,py);
                ctx.lineTo(px-s*dir.y,py-s*dir.y);
            }

            // draw path    
            ctx.stroke();
        },

        // erase pellet from background
        erasePellet: function(x,y) {
            bgCtx.translate(mapPad,mapPad);
            bgCtx.fillStyle = this.floorColor;
            this.drawNoGroutTile(bgCtx,x,y,tileSize);

            // fill in adjacent floor tiles
            if (map.getTile(x+1,y)==' ') this.drawNoGroutTile(bgCtx,x+1,y,tileSize);
            if (map.getTile(x-1,y)==' ') this.drawNoGroutTile(bgCtx,x-1,y,tileSize);
            if (map.getTile(x,y+1)==' ') this.drawNoGroutTile(bgCtx,x,y+1,tileSize);
            if (map.getTile(x,y-1)==' ') this.drawNoGroutTile(bgCtx,x,y-1,tileSize);

            // TODO: fill in adjacent wall tiles?

            bgCtx.translate(-mapPad,-mapPad);
        },

        // draw a center screen message (e.g. "start", "ready", "game over")
        drawMessage: function(text, color, x,y) {
            ctx.font = tileSize + "px ArcadeR";
            ctx.textBaseline = "top";
            ctx.textAlign = "right";
            ctx.fillStyle = color;
            x += text.length;
            ctx.fillText(text, x*tileSize, y*tileSize);
        },

        drawReadyMessage: function() {
            this.drawMessage("READY ","#FF0",11,20);
            drawExclamationPoint(ctx,16*tileSize+3, 20*tileSize+3);
        },

        // draw the points earned from the most recently eaten ghost
        drawEatenPoints: function() {
            atlas.drawGhostPoints(ctx, pacman.pixel.x, pacman.pixel.y, energizer.getPoints());
        },

        // draw each actor (ghosts and pacman)
        drawActors: function() {
            var i;
            // draw such that pacman appears on top
            if (energizer.isActive()) {
                for (i=0; i<4; i++) {
                    this.drawGhost(ghosts[i]);
                }
                if (!energizer.showingPoints())
                    this.drawPlayer();
                else
                    this.drawEatenPoints();
            }
            // draw such that pacman appears on bottom
            else {
                this.drawPlayer();
                for (i=3; i>=0; i--) {
                    if (ghosts[i].isVisible) {
                        this.drawGhost(ghosts[i]);
                    }
                }
                if (inky.isVisible && !blinky.isVisible) {
                    this.drawGhost(blinky,0.5);
                }
            }
        },

    };

    //////////////////////////////////////////////////////////////
    // Simple Renderer
    // (render a minimal Pac-Man display using nothing but squares)

    // constructor
    var SimpleRenderer = function() {

        // inherit attributes from Common Renderer
        CommonRenderer.call(this,ctx,bgCtx);

        this.messageRow = 21.7;
        this.pointsEarnedTextSize = 1.5*tileSize;

        this.backColor = "#222";
        this.floorColor = "#444";
        this.flashFloorColor = "#999";

        this.name = "Minimal";
    };

    SimpleRenderer.prototype = newChildObject(CommonRenderer.prototype, {

        drawMap: function() {

            beginMapFrame();

            var x,y;
            var i;
            var tile;

            // draw floor tiles
            bgCtx.fillStyle = (this.flashLevel ? this.flashFloorColor : this.floorColor);
            i=0;
            for (y=0; y<map.numRows; y++)
            for (x=0; x<map.numCols; x++) {
                tile = map.currentTiles[i++];
                if (tile == ' ')
                    this.drawNoGroutTile(bgCtx,x,y,tileSize);
            }

            // draw pellet tiles
            bgCtx.fillStyle = this.pelletColor;
            i=0;
            for (y=0; y<map.numRows; y++)
            for (x=0; x<map.numCols; x++) {
                tile = map.currentTiles[i++];
                if (tile == '.')
                    this.drawNoGroutTile(bgCtx,x,y,tileSize);
            }

            endMapFrame();
        },

        refreshPellet: function(x,y) {
            var i = map.posToIndex(x,y);
            var tile = map.currentTiles[i];
            if (tile == ' ') {
                this.erasePellet(x,y);
            }
            else if (tile == '.') {
                bgCtx.fillStyle = this.pelletColor;
                this.drawNoGroutTile(bgCtx,x,y,tileSize);
            }
        },


        // draw the current score and high score
        drawScore: function() {
            ctx.font = 1.5*tileSize + "px sans-serif";
            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            ctx.fillStyle = "#FFF";
            ctx.fillText(getScore(), tileSize, tileSize*2);

            ctx.font = "bold " + 1.5*tileSize + "px sans-serif";
            ctx.textBaseline = "top";
            ctx.textAlign = "center";
            ctx.fillText("high score", tileSize*map.numCols/2, 3);
            ctx.fillText(getHighScore(), tileSize*map.numCols/2, tileSize*2);
        },

        // draw the extra lives indicator
        drawExtraLives: function() {
            var i;
            ctx.fillStyle = "rgba(255,255,0,0.6)";
            var lives = extraLives == Infinity ? 1 : extraLives;
            for (i=0; i<extraLives; i++)
                this.drawCenterPixelSq(ctx, (2*i+3)*tileSize, (map.numRows-2)*tileSize+midTile.y,this.actorSize);
        },

        // draw the current level indicator
        drawLevelIcons: function() {
            var i;
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            var w = 2;
            var h = this.actorSize;
            for (i=0; i<level; i++)
                ctx.fillRect((map.numCols-2)*tileSize - i*2*w, (map.numRows-2)*tileSize+midTile.y-h/2, w, h);
        },

        // draw energizer items on foreground
        drawEnergizers: function() {
            ctx.fillStyle = this.energizerColor;
            var e;
            var i;
            for (i=0; i<map.numEnergizers; i++) {
                e = map.energizers[i];
                if (map.currentTiles[e.x+e.y*map.numCols] == 'o')
                    this.drawCenterTileSq(ctx,e.x,e.y,this.energizerSize);
            }
        },

        // draw pacman
        drawPlayer: function(scale, opacity) {
            if (scale == undefined) scale = 1;
            if (opacity == undefined) opacity = 1;
            ctx.fillStyle = "rgba(255,255,0,"+opacity+")";
            this.drawCenterPixelSq(ctx, pacman.pixel.x, pacman.pixel.y, this.actorSize*scale);
        },

        // draw dying pacman animation (with 0<=t<=1)
        drawDyingPlayer: function(t) {
            var f = t*85;
            if (f <= 60) {
                t = f/60;
                this.drawPlayer(1-t);
            }
            else {
                f -= 60;
                t = f/15;
                this.drawPlayer(t,1-t);
            }
        },

        // draw ghost
        drawGhost: function(g) {
            if (g.mode == GHOST_EATEN)
                return;
            var color = g.color;
            if (g.scared)
                color = energizer.isFlash() ? "#FFF" : "#2121ff";
            else if (g.mode == GHOST_GOING_HOME || g.mode == GHOST_ENTERING_HOME)
                color = "rgba(255,255,255,0.3)";
            ctx.fillStyle = color;
            this.drawCenterPixelSq(ctx, g.pixel.x, g.pixel.y, this.actorSize);
        },

        drawFruit: function() {
            if (fruit.isPresent()) {
                ctx.fillStyle = "#0F0";
                this.drawCenterPixelSq(ctx, fruit.pixel.x, fruit.pixel.y, tileSize+2);
            }
            else if (fruit.isScorePresent()) {
                ctx.font = this.pointsEarnedTextSize + "px sans-serif";
                ctx.textBaseline = "middle";
                ctx.textAlign = "center";
                ctx.fillStyle = "#FFF";
                ctx.fillText(fruit.getPoints(), fruit.pixel.x, fruit.pixel.y);
            }
        },

    });


    //////////////////////////////////////////////////////////////
    // Arcade Renderer
    // (render a display close to the original arcade)

    // constructor
    var ArcadeRenderer = function(ctx,bgCtx) {

        // inherit attributes from Common Renderer
        CommonRenderer.call(this,ctx,bgCtx);

        this.messageRow = 20;
        this.pelletSize = 2;
        this.energizerSize = tileSize;

        this.backColor = "#000";
        this.floorColor = "#000";
        this.flashWallColor = "#FFF";

        this.name = "Arcade";
    };

    ArcadeRenderer.prototype = newChildObject(CommonRenderer.prototype, {

        // copy background canvas to the foreground canvas
        blitMap: function() {
            ctx.scale(1/scale,1/scale);
            ctx.drawImage(bgCanvas,-1-mapPad*scale,-1-mapPad*scale); // offset map to compenstate for misalignment
            ctx.scale(scale,scale);
            //ctx.clearRect(-mapPad,-mapPad,mapWidth,mapHeight);
        },

        drawMap: function(isCutscene) {

            // fill background
            beginMapFrame();

            if (map) {

                // Sometimes pressing escape during a flash can cause flash to be permanently enabled on maps.
                // so just turn it off when not in the finish state.
                if (state != finishState) {
                    this.flashLevel = false;
                }

                var x,y;
                var i,j;
                var tile;

                // ghost house door
                i=0;
                for (y=0; y<map.numRows; y++)
                for (x=0; x<map.numCols; x++) {
                    if (map.currentTiles[i] == '-' && map.currentTiles[i+1] == '-') {
                        bgCtx.fillStyle = "#ffb8de";
                        bgCtx.fillRect(x*tileSize,y*tileSize+tileSize-2,tileSize*2,2);
                    }
                    i++;
                }

                if (this.flashLevel) {
                    bgCtx.fillStyle = "#000";
                    bgCtx.strokeStyle = "#fff";
                }
                else {
                    bgCtx.fillStyle = map.wallFillColor;
                    bgCtx.strokeStyle = map.wallStrokeColor;
                }
                for (i=0; i<map.paths.length; i++) {
                    var path = map.paths[i];
                    bgCtx.beginPath();
                    bgCtx.moveTo(path[0].x, path[0].y);
                    for (j=1; j<path.length; j++) {
                        if (path[j].cx != undefined)
                            bgCtx.quadraticCurveTo(path[j].cx, path[j].cy, path[j].x, path[j].y);
                        else
                            bgCtx.lineTo(path[j].x, path[j].y);
                    }
                    bgCtx.quadraticCurveTo(path[j-1].x, path[0].y, path[0].x, path[0].y);
                    bgCtx.fill();
                    bgCtx.stroke();
                }

                // draw pellet tiles
                bgCtx.fillStyle = map.pelletColor;
                i=0;
                for (y=0; y<map.numRows; y++)
                for (x=0; x<map.numCols; x++) {
                    this.refreshPellet(x,y,true);
                }

                if (map.onDraw) {
                    map.onDraw(bgCtx);
                }

                if (map.shouldDrawMapOnly) {
                    endMapFrame();
                    return;
                }
            }
            if (level > 0) {

                var numRows = 36;
                var numCols = 28;

                if (!isCutscene) {
                    // draw extra lives
                    var i;
                    bgCtx.fillStyle = pacman.color;

                    bgCtx.save();
                    bgCtx.translate(3*tileSize, (numRows-1)*tileSize);
                    bgCtx.scale(0.85, 0.85);
                    var lives = extraLives == Infinity ? 1 : extraLives;
                    if (gameMode == GAME_PACMAN) {
                        for (i=0; i<lives; i++) {
                            drawPacmanSprite(bgCtx, 0,0, DIR_LEFT, Math.PI/6);
                            bgCtx.translate(2*tileSize,0);
                        }
                    }
                    else if (gameMode == GAME_MSPACMAN) {
                        for (i=0; i<lives; i++) {
                            drawMsPacmanSprite(bgCtx, 0,0, DIR_RIGHT, 1);
                            bgCtx.translate(2*tileSize,0);
                        }
                    }
                    else if (gameMode == GAME_COOKIE) {
                        for (i=0; i<lives; i++) {
                            drawCookiemanSprite(bgCtx, 0,0, DIR_RIGHT, 1, false);
                            bgCtx.translate(2*tileSize,0);
                        }
                    }
                    else if (gameMode == GAME_OTTO) {
                        for (i=0; i<lives; i++) {
                            drawOttoSprite(bgCtx, 0,0,DIR_RIGHT, 0);
                            bgCtx.translate(2*tileSize,0);
                        }
                    }
                    if (extraLives == Infinity) {
                        bgCtx.translate(-4*tileSize,0);

                        // draw X
                        /*
                        bgCtx.translate(-s*2,0);
                        var s = 2; // radius of each stroke
                        bgCtx.beginPath();
                        bgCtx.moveTo(-s,-s);
                        bgCtx.lineTo(s,s);
                        bgCtx.moveTo(-s,s);
                        bgCtx.lineTo(s,-s);
                        bgCtx.lineWidth = 1;
                        bgCtx.strokeStyle = "#777";
                        bgCtx.stroke();
                        */

                        // draw Infinity symbol
                        var r = 2; // radius of each half-circle
                        var d = 3; // distance between the two focal points
                        bgCtx.beginPath();
                        bgCtx.moveTo(-d-r,0);
                        bgCtx.quadraticCurveTo(-d-r,-r,-d,-r);
                        bgCtx.bezierCurveTo(-(d-r),-r,d-r,r,d,r);
                        bgCtx.quadraticCurveTo(d+r,r,d+r,0);
                        bgCtx.quadraticCurveTo(d+r,-r,d,-r);
                        bgCtx.bezierCurveTo(d-r,-r,-(d-r),r,-d,r);
                        bgCtx.quadraticCurveTo(-d-r,r,-d-r,0);
                        bgCtx.lineWidth = 1;
                        bgCtx.strokeStyle = "#FFF";
                        bgCtx.stroke();
                    }
                    bgCtx.restore();
                }

                // draw level fruit
                var fruits = fruit.fruitHistory;
                var i,j;
                var f,drawFunc;
                var numFruit = 7;
                var startLevel = Math.max(numFruit,level);
                if (gameMode != GAME_PACMAN) {
                    // for the Pac-Man game, display the last 7 fruit
                    // for the Ms Pac-Man game, display stop after the 7th fruit
                    startLevel = Math.min(numFruit,startLevel);
                }
                var scale = 0.85;
                for (i=0, j=startLevel-numFruit+1; i<numFruit && j<=level; j++, i++) {
                    f = fruits[j];
                    if (f) {
                        drawFunc = getSpriteFuncFromFruitName(f.name);
                        if (drawFunc) {
                            bgCtx.save();
                            bgCtx.translate((numCols-3)*tileSize - i*16*scale, (numRows-1)*tileSize);
                            bgCtx.scale(scale,scale);
                            drawFunc(bgCtx,0,0);
                            bgCtx.restore();
                        }
                    }
                }
                if (!isCutscene) {
                    if (level >= 100) {
                        bgCtx.font = (tileSize-3) + "px ArcadeR";
                    }
                    else {
                        bgCtx.font = (tileSize-1) + "px ArcadeR";
                    }
                    bgCtx.textBaseline = "middle";
                    bgCtx.fillStyle = "#777";
                    bgCtx.textAlign = "left";
                    bgCtx.fillText(level,(numCols-2)*tileSize, (numRows-1)*tileSize);
                }
            }
            endMapFrame();
        },

        erasePellet: function(x,y,isTranslated) {
            if (!isTranslated) {
                bgCtx.translate(mapPad,mapPad);
            }
            bgCtx.fillStyle = "#000";
            var i = map.posToIndex(x,y);
            var size = map.tiles[i] == 'o' ? this.energizerSize : this.pelletSize;
            this.drawCenterTileSq(bgCtx,x,y,size+2);
            if (!isTranslated) {
                bgCtx.translate(-mapPad,-mapPad);
            }
        },

        refreshPellet: function(x,y,isTranslated) {
            if (!isTranslated) {
                bgCtx.translate(mapPad,mapPad);
            }
            var i = map.posToIndex(x,y);
            var tile = map.currentTiles[i];
            if (tile == ' ') {
                this.erasePellet(x,y,isTranslated);
            }
            else if (tile == '.') {
                bgCtx.fillStyle = map.pelletColor;
                bgCtx.translate(0.5, 0.5);
                this.drawCenterTileSq(bgCtx,x,y,this.pelletSize);
                bgCtx.translate(-0.5, -0.5);
            }
            else if (tile == 'o') {
                bgCtx.fillStyle = map.pelletColor;
                bgCtx.beginPath();
                bgCtx.arc(x*tileSize+midTile.x+0.5,y*tileSize+midTile.y,this.energizerSize/2,0,Math.PI*2);
                bgCtx.fill();
            }
            if (!isTranslated) {
                bgCtx.translate(-mapPad,-mapPad);
            }
        },

        // draw the current score and high score
        drawScore: function() {
            ctx.font = tileSize + "px ArcadeR";
            ctx.textBaseline = "top";
            ctx.fillStyle = "#FFF";

            ctx.textAlign = "right";
            ctx.fillText("1UP", 6*tileSize, 0);
            ctx.fillText(practiceMode ? "PRACTICE" : "HIGH SCORE", 19*tileSize, 0);
            //ctx.fillText("2UP", 25*tileSize, 0);

            // TODO: player two score
            var score = getScore();
            if (score == 0) {
                score = "00";
            }
            var y = tileSize+1;
            ctx.fillText(score, 7*tileSize, y);

            if (!practiceMode) {
                var highScore = getHighScore();
                if (highScore == 0) {
                    highScore = "00";
                }
                ctx.fillText(highScore, 17*tileSize, y);
            }
        },

        // draw ghost
        drawGhost: function(g,alpha) {
            var backupAlpha;
            if (alpha) {
                backupAlpha = ctx.globalAlpha;
                ctx.globalAlpha = alpha;
            }

            var draw = function(mode, pixel, frames, faceDirEnum, scared, isFlash,color, dirEnum) {
                if (mode == GHOST_EATEN)
                    return;
                var frame = g.getAnimFrame(frames);
                var eyes = (mode == GHOST_GOING_HOME || mode == GHOST_ENTERING_HOME);
                var func = getGhostDrawFunc();
                var y = g.getBounceY(pixel.x, pixel.y, dirEnum);
                var x = (g == blinky && scared) ? pixel.x+1 : pixel.x; // blinky's sprite is shifted right when scared

                func(ctx,x,y,frame,faceDirEnum,scared,isFlash,eyes,color);
            };
            vcr.drawHistory(ctx, function(t) {
                draw(
                    g.savedMode[t],
                    g.savedPixel[t],
                    g.savedFrames[t],
                    g.savedFaceDirEnum[t],
                    g.savedScared[t],
                    energizer.isFlash(),
                    g.color,
                    g.savedDirEnum[t]);
            });
            draw(g.mode, g.pixel, g.frames, g.faceDirEnum, g.scared, energizer.isFlash(), g.color, g.dirEnum);
            if (alpha) {
                ctx.globalAlpha = backupAlpha;
            }
        },

        // draw pacman
        drawPlayer: function() {
            var frame = pacman.getAnimFrame();
            if (pacman.invincible) {
                ctx.globalAlpha = 0.6;
            }

            var draw = function(pixel, dirEnum, steps) {
                var frame = pacman.getAnimFrame(pacman.getStepFrame(steps));
                var func = getPlayerDrawFunc();
                func(ctx, pixel.x, pixel.y, dirEnum, frame, true);
            };

            vcr.drawHistory(ctx, function(t) {
                draw(
                    pacman.savedPixel[t],
                    pacman.savedDirEnum[t],
                    pacman.savedSteps[t]);
            });
            draw(pacman.pixel, pacman.dirEnum, pacman.steps);
            if (pacman.invincible) {
                ctx.globalAlpha = 1;
            }
        },

        // draw dying pacman animation (with 0<=t<=1)
        drawDyingPlayer: function(t) {
            var frame = pacman.getAnimFrame();

            if (gameMode == GAME_PACMAN) {
                // 60 frames dying
                // 15 frames exploding
                var f = t*75;
                if (f <= 60) {
                    // open mouth all the way while shifting corner of mouth forward
                    t = f/60;
                    var a = frame*Math.PI/6;
                    drawPacmanSprite(ctx, pacman.pixel.x, pacman.pixel.y, pacman.dirEnum, a + t*(Math.PI-a),4*t);
                }
                else {
                    // explode
                    f -= 60;
                    this.drawExplodingPlayer(f/15);
                }
            }
            else if (gameMode == GAME_OTTO) {
                // TODO: spin around
                if (t < 0.8) {
                    var dirEnum = Math.floor((pacman.dirEnum - t*16))%4;
                    if (dirEnum < 0) {
                        dirEnum += 4;
                    }
                    drawOttoSprite(ctx, pacman.pixel.x, pacman.pixel.y, dirEnum, 0);
                }
                else if (t < 0.95) {
                    var dirEnum = Math.floor((pacman.dirEnum - 0.8*16))%4;
                    if (dirEnum < 0) {
                        dirEnum += 4;
                    }
                    drawOttoSprite(ctx, pacman.pixel.x, pacman.pixel.y, dirEnum, 0);
                }
                else {
                    drawDeadOttoSprite(ctx,pacman.pixel.x, pacman.pixel.y);
                }
            }
            else if (gameMode == GAME_MSPACMAN) {
                // spin 540 degrees
                var maxAngle = Math.PI*5;
                var step = (Math.PI/4) / maxAngle; // 45 degree steps
                var angle = Math.floor(t/step)*step*maxAngle;
                drawMsPacmanSprite(ctx, pacman.pixel.x, pacman.pixel.y, pacman.dirEnum, frame, angle);
            }
            else if (gameMode == GAME_COOKIE) {
                // spin 540 degrees
                var maxAngle = Math.PI*5;
                var step = (Math.PI/4) / maxAngle; // 45 degree steps
                var angle = Math.floor(t/step)*step*maxAngle;
                drawCookiemanSprite(ctx, pacman.pixel.x, pacman.pixel.y, pacman.dirEnum, frame, false, angle);
            }
        },

        // draw exploding pacman animation (with 0<=t<=1)
        drawExplodingPlayer: function(t) {
            var frame = pacman.getAnimFrame();
            drawPacmanSprite(ctx, pacman.pixel.x, pacman.pixel.y, pacman.dirEnum, 0, 0, t,-3,1-t);
        },

        // draw fruit
        drawFruit: function() {

            if (fruit.getCurrentFruit()) {
                var name = fruit.getCurrentFruit().name;

                // draw history trails of the fruit if applicable
                if (fruit.savedPixel) {
                    vcr.drawHistory(ctx, function(t) {
                        var pixel = fruit.savedPixel[t];
                        if (pixel) {
                            atlas.drawFruitSprite(ctx, pixel.x, pixel.y, name);
                        }
                    });
                }

                if (fruit.isPresent()) {
                    atlas.drawFruitSprite(ctx, fruit.pixel.x, fruit.pixel.y, name);
                }
                else if (fruit.isScorePresent()) {
                    if (gameMode == GAME_PACMAN) {
                        atlas.drawPacFruitPoints(ctx, fruit.pixel.x, fruit.pixel.y, fruit.getPoints());
                    }
                    else {
                        atlas.drawMsPacFruitPoints(ctx, fruit.pixel.x, fruit.pixel.y, fruit.getPoints());
                    }
                }
            }
        },

    });

    //
    // Create list of available renderers
    //
    renderer_list = [
        new SimpleRenderer(),
        new ArcadeRenderer(),
    ];
    renderer = renderer_list[1];
};
