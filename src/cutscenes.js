////////////////////////////////////////////////
// Cutscenes
//

var playCutScene = function(cutScene, nextState) {

    // redraw map buffer with fruit list but no map structure
    map = undefined;
    renderer.drawMap(true);

    // miss the audio silence and time it cleanly for pacman cut scene 1
    setTimeout(audio.coffeeBreakMusic.startLoop, 1200);
    cutScene.nextState = nextState;
    switchState(cutScene, 60);

};

var pacmanCutscene1 = newChildObject(scriptState, {
    init: function() {
        scriptState.init.call(this);

        // initialize actor positions
        pacman.setPos(232, 164);
        blinky.setPos(257, 164);

        // initialize actor directions
        blinky.setDir(DIR_LEFT);
        blinky.faceDirEnum = DIR_LEFT;
        pacman.setDir(DIR_LEFT);

        // initialize misc actor properties
        blinky.scared = false;
        blinky.mode = GHOST_OUTSIDE;

        // clear other states
        backupCheats();
        clearCheats();
        energizer.reset();

        // temporarily override actor step sizes
        pacman.getNumSteps = function() {
            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_PACMAN);
        };
        blinky.getNumSteps = function() {
            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_ELROY2);
        };

        // temporarily override steering functions
        pacman.steer = blinky.steer = function(){};
    },
    triggers: {

        // Blinky chases Pac-Man
        0: {
            update: function() {
                var j;
                for (j=0; j<2; j++) {
                    pacman.update(j);
                    blinky.update(j);
                }
                pacman.frames++;
                blinky.frames++;
            },
            draw: function() {
                renderer.blitMap();
                renderer.beginMapClip();
                renderer.drawPlayer();
                renderer.drawGhost(blinky);
                renderer.endMapClip();
            },
        },

        // Pac-Man chases Blinky
        260: {
            init: function() {
                pacman.setPos(-193, 155);
                blinky.setPos(-8, 164);

                // initialize actor directions
                blinky.setDir(DIR_RIGHT);
                blinky.faceDirEnum = DIR_RIGHT;
                pacman.setDir(DIR_RIGHT);

                // initialize misc actor properties
                blinky.scared = true;

                // temporarily override step sizes
                pacman.getNumSteps = function() {
                    return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_PACMAN_FRIGHT);
                };
                blinky.getNumSteps = function() {
                    return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_GHOST_FRIGHT);
                };
            },
            update: function() {
                var j;
                for (j=0; j<2; j++) {
                    pacman.update(j);
                    blinky.update(j);
                }
                pacman.frames++;
                blinky.frames++;
            },
            draw: function() {
                renderer.blitMap();
                renderer.beginMapClip();
                renderer.drawGhost(blinky);
                renderer.renderFunc(function(ctx) {
                    var frame = Math.floor(pacman.steps/4) % 4; // slower to switch animation frame when giant
                    if (frame == 3) {
                        frame = 1;
                    }
                    drawGiantPacmanSprite(ctx, pacman.pixel.x, pacman.pixel.y, pacman.dirEnum, frame);
                });
                renderer.endMapClip();
            },
        },

        // end
        640: {
            init: function() {
                // disable custom steps
                delete pacman.getNumSteps;
                delete blinky.getNumSteps;

                // disable custom steering
                delete pacman.steer;
                delete blinky.steer;

                // exit to next level
                restoreCheats();
                switchState(pacmanCutscene1.nextState, 60);
            },
        },
    },
});

var mspacmanCutscene1 = (function() {

    // create new players pac and mspac for this scene
    var pac = new Player();
    var mspac = new Player();

    // draws pac or mspac
    var drawPlayer = function(ctx,player) {
        var frame = player.getAnimFrame();
        var func;
        if (player == pac) {
            func = gameMode == GAME_MSPACMAN ? atlas.drawPacmanSprite : atlas.drawOttoSprite;
        }
        else if (player == mspac) {
            func = gameMode == GAME_MSPACMAN ? atlas.drawMsPacmanSprite : atlas.drawMsOttoSprite;
        }
        func(ctx, player.pixel.x, player.pixel.y, player.dirEnum, frame);
    };

    // draws all actors
    var draw = function() {
        renderer.blitMap();
        renderer.beginMapClip();
        renderer.renderFunc(function(ctx) {
            drawPlayer(ctx,pac);
            drawPlayer(ctx,mspac);
        });
        renderer.drawGhost(inky);
        renderer.drawGhost(pinky);
        renderer.endMapClip();
    };

    // updates all actors
    var update = function() {
        var j;
        for (j=0; j<2; j++) {
            pac.update(j);
            mspac.update(j);
            inky.update(j);
            pinky.update(j);
        }
        pac.frames++;
        mspac.frames++;
        inky.frames++;
        pinky.frames++;
    };

    var exit = function() {
        // disable custom steps
        delete inky.getNumSteps;
        delete pinky.getNumSteps;

        // disable custom steering
        delete inky.steer;
        delete pinky.steer;

        // disable custom animation steps
        delete inky.getAnimFrame;
        delete pinky.getAnimFrame;

        // exit to next level
        restoreCheats();
        switchState(mspacmanCutscene1.nextState, 60);
    };

    return newChildObject(scriptState, {

        init: function() {
            scriptState.init.call(this);

            // chosen by trial-and-error to match animations
            mspac.frames = 20;
            pac.frames = 12;

            // initialize actor states
            pac.setPos(-10, 99);
            pac.setDir(DIR_RIGHT);
            mspac.setPos(232, 180);
            mspac.setDir(DIR_LEFT);
            
            // initial ghost states
            inky.frames = 0;
            inky.mode = GHOST_OUTSIDE;
            inky.scared = false;
            inky.setPos(pac.pixel.x-42, 99);
            inky.setDir(DIR_RIGHT);
            inky.faceDirEnum = DIR_RIGHT;
            pinky.frames = 3;
            pinky.mode = GHOST_OUTSIDE;
            pinky.scared = false;
            pinky.setPos(mspac.pixel.x+49, 180);
            pinky.setDir(DIR_LEFT);
            pinky.faceDirEnum = DIR_LEFT;

            // clear other states
            backupCheats();
            clearCheats();
            energizer.reset();

            // step player animation every four frames
            pac.getStepFrame = function() { return Math.floor(this.frames/4)%4; };
            mspac.getStepFrame = function() { return Math.floor(this.frames/4)%4; };

            // step ghost animation every six frames
            inky.getAnimFrame = function() { return Math.floor(this.frames/8)%2; };
            pinky.getAnimFrame = function() { return Math.floor(this.frames/8)%2; };

            // set actor step sizes
            pac.getNumSteps = function() { return 1; };
            mspac.getNumSteps = function() { return 1; };
            inky.getNumSteps = function() { return 1; };
            pinky.getNumSteps = function() { return 1; };

            // set steering functions
            pac.steer = function(){};
            mspac.steer = function(){};
            inky.steer = function(){};
            pinky.steer = function(){};
        },
        triggers: {

            // Inky chases Pac, Pinky chases Mspac
            0: {
                update: function() {
                    update();
                    if (inky.pixel.x == 105) {
                        // speed up the ghosts
                        inky.getNumSteps = function() {
                            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_ELROY2);
                        };
                        pinky.getNumSteps = function() {
                            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_ELROY2);
                        };
                    }
                },
                draw: draw,
            },

            // MsPac and Pac converge with ghosts chasing
            300: (function(){

                // bounce animation when ghosts bump heads
                var inkyBounceX =  [ 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
                var inkyBounceY =  [-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1];
                var pinkyBounceX = [ 0, 0, 0, 0,-1, 0,-1, 0, 0,-1, 0,-1, 0,-1, 0, 0,-1, 0,-1, 0,-1, 0, 0,-1, 0,-1, 0,-1, 0, 0];
                var pinkyBounceY = [ 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0];
                var inkyBounceFrame = 0;
                var pinkyBounceFrame = 0;
                var inkyBounceFrameLen = inkyBounceX.length;
                var pinkyBounceFrameLen = pinkyBounceX.length;

                // ramp animation for players
                var rampX = [0, 1, 1, 1, 1, 0, 0];
                var rampY = [0, 0,-1,-1,-1, 0, 0];
                var rampFrame = 0;
                var rampFrameLen = rampX.length;

                // climbing
                var climbFrame = 0;

                // meeting
                var meetFrame = 0;

                var ghostMode;
                var GHOST_RUN = 0;
                var GHOST_BUMP = 1;

                var playerMode;
                var PLAYER_RUN = 0;
                var PLAYER_RAMP = 1;
                var PLAYER_CLIMB = 2;
                var PLAYER_MEET = 3;
                     
                return {
                    init: function() {
                        // reset frames
                        inkyBounceFrame = pinkyBounceFrame = rampFrame = climbFrame = meetFrame = 0;

                        // set modes
                        ghostMode = GHOST_RUN;
                        playerMode = PLAYER_RUN;

                        // set initial positions and directions
                        mspac.setPos(-8,143);
                        mspac.setDir(DIR_RIGHT);

                        pinky.setPos(-81,143);
                        pinky.faceDirEnum = DIR_RIGHT;
                        pinky.setDir(DIR_RIGHT);

                        pac.setPos(223+8+3,142);
                        pac.setDir(DIR_LEFT);

                        inky.setPos(302,143);
                        inky.faceDirEnum = DIR_LEFT;
                        inky.setDir(DIR_LEFT);

                        // set ghost speed
                        inky.getNumSteps = pinky.getNumSteps = function() {
                            return "11211212"[this.frames%8];
                        };
                    },
                    update: function() {
                        var j;

                        // update players
                        if (playerMode == PLAYER_RUN) {
                            for (j=0; j<2; j++) {
                                pac.update(j);
                                mspac.update(j);
                            }
                            if (mspac.pixel.x == 102) {
                                playerMode++;
                            }
                        }
                        else if (playerMode == PLAYER_RAMP) {
                            pac.pixel.x -= rampX[rampFrame];
                            pac.pixel.y += rampY[rampFrame];
                            pac.commitPos();
                            mspac.pixel.x += rampX[rampFrame];
                            mspac.pixel.y += rampY[rampFrame];
                            mspac.commitPos();
                            rampFrame++;
                            if (rampFrame == rampFrameLen) {
                                playerMode++;
                            }
                        }
                        else if (playerMode == PLAYER_CLIMB) {
                            if (climbFrame == 0) {
                                // set initial climb state for mspac
                                mspac.pixel.y -= 2;
                                mspac.commitPos();
                                mspac.setDir(DIR_UP);

                                // set initial climb state for pac
                                pac.pixel.x -= 1;
                                pac.commitPos();
                                pac.setDir(DIR_UP);
                            }
                            else {
                                for (j=0; j<2; j++) {
                                    pac.update(j);
                                    mspac.update(j);
                                }
                            }
                            climbFrame++;
                            if (mspac.pixel.y == 91) {
                                playerMode++;
                            }
                        }
                        else if (playerMode == PLAYER_MEET) {
                            if (meetFrame == 0) {
                                // set initial meet state for mspac
                                mspac.pixel.y++;
                                mspac.setDir(DIR_RIGHT);
                                mspac.commitPos();

                                // set initial meet state for pac
                                pac.pixel.y--;
                                pac.pixel.x++;
                                pac.setDir(DIR_LEFT);
                                pac.commitPos();
                            }
                            if (meetFrame > 18) {
                                // pause player frames after a certain period
                                pac.frames--;
                                mspac.frames--;
                            }
                            if (meetFrame == 78) {
                                exit();
                            }
                            meetFrame++;
                        }
                        pac.frames++;
                        mspac.frames++;

                        // update ghosts
                        if (ghostMode == GHOST_RUN) {
                            for (j=0; j<2; j++) {
                                inky.update(j);
                                pinky.update(j);
                            }

                            // stop at middle
                            inky.pixel.x = Math.max(120, inky.pixel.x);
                            inky.commitPos();
                            pinky.pixel.x = Math.min(105, pinky.pixel.x);
                            pinky.commitPos();

                            if (pinky.pixel.x == 105) {
                                ghostMode++;
                            }
                        }
                        else if (ghostMode == GHOST_BUMP) {
                            if (inkyBounceFrame < inkyBounceFrameLen) {
                                inky.pixel.x += inkyBounceX[inkyBounceFrame];
                                inky.pixel.y += inkyBounceY[inkyBounceFrame];
                            }
                            if (pinkyBounceFrame < pinkyBounceFrameLen) {
                                pinky.pixel.x += pinkyBounceX[pinkyBounceFrame];
                                pinky.pixel.y += pinkyBounceY[pinkyBounceFrame];
                            }
                            inkyBounceFrame++;
                            pinkyBounceFrame++;
                        }
                        inky.frames++;
                        pinky.frames++;
                    },
                    draw: function() {
                        renderer.blitMap();
                        renderer.beginMapClip();
                        renderer.renderFunc(function(ctx) {
                            drawPlayer(ctx,pac);
                            drawPlayer(ctx,mspac);
                        });
                        if (inkyBounceFrame < inkyBounceFrameLen) {
                            renderer.drawGhost(inky);
                        }
                        if (pinkyBounceFrame < pinkyBounceFrameLen) {
                            renderer.drawGhost(pinky);
                        }
                        if (playerMode == PLAYER_MEET) {
                            renderer.renderFunc(function(ctx) {
                                drawHeartSprite(ctx, 112, 73);
                            });
                        }
                        renderer.endMapClip();
                    },
                }; // returned object
            })(), // trigger at 300
        }, // triggers
    }); // returned object
})(); // mspacCutscene1

var mspacmanCutscene2 = (function() {

    // create new players pac and mspac for this scene
    var pac = new Player();
    var mspac = new Player();

    // draws pac or mspac
    var drawPlayer = function(ctx,player) {
        var frame = player.getAnimFrame();
        var func;
        if (player == pac) {
            func = gameMode == GAME_MSPACMAN ? atlas.drawPacmanSprite : atlas.drawOttoSprite;
        }
        else if (player == mspac) {
            func = gameMode == GAME_MSPACMAN ? atlas.drawMsPacmanSprite : atlas.drawMsOttoSprite;
        }
        func(ctx, player.pixel.x, player.pixel.y, player.dirEnum, frame);
    };

    // draws all actors
    var draw = function() {
        renderer.blitMap();
        renderer.beginMapClip();
        renderer.renderFunc(function(ctx) {
            drawPlayer(ctx,pac);
            drawPlayer(ctx,mspac);
        });
        renderer.endMapClip();
    };

    // updates all actors
    var update = function() {
        var j;
        for (j=0; j<7; j++) {
            pac.update(j);
            mspac.update(j);
        }
        pac.frames++;
        mspac.frames++;
    };

    var exit = function() {
        // exit to next level
        restoreCheats();
        switchState(mspacmanCutscene2.nextState, 60);
    };

    var getChaseSteps = function() { return 3; };
    var getFleeSteps = function() { return "32"[this.frames%2]; };
    var getDartSteps = function() { return 7; };

    return newChildObject(scriptState, {

        init: function() {
            scriptState.init.call(this);

            // chosen by trial-and-error to match animations
            mspac.frames = 20;
            pac.frames = 12;

            // step player animation every four frames
            pac.getStepFrame = function() { return Math.floor(this.frames/4)%4; };
            mspac.getStepFrame = function() { return Math.floor(this.frames/4)%4; };

            // set steering functions
            pac.steer = function(){};
            mspac.steer = function(){};
            
            backupCheats();
            clearCheats();
        },
        triggers: {
            0: {
                draw: function() {
                    renderer.blitMap();
                },
            },

            160: {
                init: function() {
                    pac.setPos(-8, 67);
                    pac.setDir(DIR_RIGHT);

                    mspac.setPos(-106, 68);
                    mspac.setDir(DIR_RIGHT);

                    pac.getNumSteps = getFleeSteps;
                    mspac.getNumSteps = getChaseSteps;
                },
                update: update,
                draw: draw,
            },
            410: {
                init: function() {
                    pac.setPos(329, 163);
                    pac.setDir(DIR_LEFT);

                    mspac.setPos(223+8, 164);
                    mspac.setDir(DIR_LEFT);

                    pac.getNumSteps = getChaseSteps;
                    mspac.getNumSteps = getFleeSteps;
                },
                update: update,
                draw: draw,
            },
            670: {
                init: function() {
                    pac.setPos(-8,142);
                    pac.setDir(DIR_RIGHT);

                    mspac.setPos(-106, 143);
                    mspac.setDir(DIR_RIGHT);

                    pac.getNumSteps = getFleeSteps;
                    mspac.getNumSteps = getChaseSteps;
                },
                update: update,
                draw: draw,
            },
            930: {
                init: function() {
                    pac.setPos(233+148,99);
                    pac.setDir(DIR_LEFT);

                    mspac.setPos(233,100);
                    mspac.setDir(DIR_LEFT);

                    pac.getNumSteps = getDartSteps;
                    mspac.getNumSteps = getDartSteps;
                },
                update: function() {
                    if (pac.pixel.x <= 17 && pac.dirEnum == DIR_LEFT) {
                        pac.setPos(-2,195);
                        pac.setDir(DIR_RIGHT);

                        mspac.setPos(-2-148,196);
                        mspac.setDir(DIR_RIGHT);
                    }
                    update();
                },
                draw: draw,
            },
            1140: {
                init: exit,
            },
        }, // triggers
    }); // returned object
})(); // mspacCutscene2

var cookieCutscene1 = newChildObject(scriptState, {

    init: function() {
        scriptState.init.call(this);

        // initialize actor positions
        pacman.setPos(232, 164);
        blinky.setPos(257, 164);

        // initialize actor directions
        blinky.setDir(DIR_LEFT);
        blinky.faceDirEnum = DIR_LEFT;
        pacman.setDir(DIR_LEFT);

        // initialize misc actor properties
        blinky.scared = false;
        blinky.mode = GHOST_OUTSIDE;

        // clear other states
        backupCheats();
        clearCheats();
        energizer.reset();

        // temporarily override actor step sizes
        pacman.getNumSteps = function() {
            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_PACMAN);
        };
        blinky.getNumSteps = function() {
            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_ELROY2);
        };

        // temporarily override steering functions
        pacman.steer = blinky.steer = function(){};
    },
    triggers: {

        // Blinky chases Pac-Man
        0: {
            update: function() {
                var j;
                for (j=0; j<2; j++) {
                    pacman.update(j);
                    blinky.update(j);
                }
                pacman.frames++;
                blinky.frames++;
            },
            draw: function() {
                renderer.blitMap();
                renderer.beginMapClip();
                renderer.drawPlayer();
                renderer.drawGhost(blinky);
                renderer.endMapClip();
            },
        },

        // Pac-Man chases Blinky
        260: {
            init: function() {
                pacman.setPos(-193, 164);
                blinky.setPos(-8, 155);

                // initialize actor directions
                blinky.setDir(DIR_RIGHT);
                blinky.faceDirEnum = DIR_RIGHT;
                pacman.setDir(DIR_RIGHT);

                // initialize misc actor properties
                blinky.scared = true;

                // temporarily override step sizes
                pacman.getNumSteps = function() {
                    return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_PACMAN_FRIGHT);
                };
                blinky.getNumSteps = function() {
                    return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_GHOST_FRIGHT);
                };
            },
            update: function() {
                var j;
                for (j=0; j<2; j++) {
                    pacman.update(j);
                    blinky.update(j);
                }
                pacman.frames++;
                blinky.frames++;
            },
            draw: function() {
                renderer.blitMap();
                renderer.beginMapClip();
                renderer.drawPlayer();
                renderer.renderFunc(function(ctx) {
                    var y = blinky.getBounceY(blinky.pixel.x, blinky.pixel.y, DIR_RIGHT);
                    var x = blinky.pixel.x;
                    ctx.save();
                    ctx.translate(x,y);
                    var s = 16/6;
                    ctx.scale(s,s);
                    drawCookie(ctx,0,0);
                    ctx.restore();
                });
                renderer.endMapClip();
            },
        },

        // end
        640: {
            init: function() {
                // disable custom steps
                delete pacman.getNumSteps;
                delete blinky.getNumSteps;

                // disable custom steering
                delete pacman.steer;
                delete blinky.steer;

                // exit to next level
                restoreCheats();
                switchState(cookieCutscene1.nextState, 60);
            },
        },
    },
});

var cookieCutscene2 = (function() {

    /*
    NOTE:
    This is a copy-paste of mspacmanCutscene1.
    pac is replaced with a scared ghost (bouncing cookie)
    mspac is replaced with Cookie-Man
    */

    // create new players pac and mspac for this scene
    var pac = new Ghost();
    pac.scared = true;
    pac.mode = GHOST_OUTSIDE;
    var mspac = new Player();

    // draws pac or mspac
    var drawPlayer = function(ctx,player) {
        var frame = player.getAnimFrame();
        var func;
        if (player == pac) {
            var y = player.getBounceY(player.pixel.x, player.pixel.y, player.dirEnum);
            atlas.drawMuppetSprite(ctx, player.pixel.x, y, 0, player.dirEnum, true, false);
        }
        else if (player == mspac) {
            drawCookiemanSprite(ctx, player.pixel.x, player.pixel.y, player.dirEnum, frame, true);
        }
    };

    // draws all actors
    var draw = function() {
        renderer.blitMap();
        renderer.beginMapClip();
        renderer.renderFunc(function(ctx) {
            drawPlayer(ctx,pac);
            drawPlayer(ctx,mspac);
        });
        renderer.drawGhost(inky);
        renderer.drawGhost(pinky);
        renderer.endMapClip();
    };

    // updates all actors
    var update = function() {
        var j;
        for (j=0; j<2; j++) {
            pac.update(j);
            mspac.update(j);
            inky.update(j);
            pinky.update(j);
        }
        pac.frames++;
        mspac.frames++;
        inky.frames++;
        pinky.frames++;
    };

    var exit = function() {
        // disable custom steps
        delete inky.getNumSteps;
        delete pinky.getNumSteps;

        // disable custom steering
        delete inky.steer;
        delete pinky.steer;

        // disable custom animation steps
        delete inky.getAnimFrame;
        delete pinky.getAnimFrame;

        // exit to next level
        restoreCheats();
        switchState(cookieCutscene2.nextState, 60);
    };

    return newChildObject(scriptState, {

        init: function() {
            scriptState.init.call(this);

            // chosen by trial-and-error to match animations
            mspac.frames = 14;
            pac.frames = 12;

            // initialize actor states
            pac.setPos(-10, 99);
            pac.setDir(DIR_RIGHT);
            mspac.setPos(232, 180);
            mspac.setDir(DIR_LEFT);
            
            // initial ghost states
            inky.frames = 0;
            inky.mode = GHOST_OUTSIDE;
            inky.scared = false;
            inky.setPos(pac.pixel.x-42, 99);
            inky.setDir(DIR_RIGHT);
            inky.faceDirEnum = DIR_RIGHT;
            pinky.frames = 3;
            pinky.mode = GHOST_OUTSIDE;
            pinky.scared = false;
            pinky.setPos(mspac.pixel.x+49, 180);
            pinky.setDir(DIR_LEFT);
            pinky.faceDirEnum = DIR_LEFT;

            // clear other states
            backupCheats();
            clearCheats();
            energizer.reset();

            // step player animation every four frames
            pac.getStepFrame = function() { return Math.floor(this.frames/4)%4; };
            mspac.getStepFrame = function() { return Math.floor(this.frames/4)%4; };

            // step ghost animation every six frames
            inky.getAnimFrame = function() { return Math.floor(this.frames/8)%2; };
            pinky.getAnimFrame = function() { return Math.floor(this.frames/8)%2; };

            // set actor step sizes
            pac.getNumSteps = function() { return 1; };
            mspac.getNumSteps = function() { return 1; };
            inky.getNumSteps = function() { return 1; };
            pinky.getNumSteps = function() { return 1; };

            // set steering functions
            pac.steer = function(){};
            mspac.steer = function(){};
            inky.steer = function(){};
            pinky.steer = function(){};
        },
        triggers: {

            // Inky chases Pac, Pinky chases Mspac
            0: {
                update: function() {
                    update();
                    if (inky.pixel.x == 105) {
                        // speed up the ghosts
                        inky.getNumSteps = function() {
                            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_ELROY2);
                        };
                        pinky.getNumSteps = function() {
                            return Actor.prototype.getStepSizeFromTable.call(this, 5, STEP_ELROY2);
                        };
                    }
                },
                draw: draw,
            },

            // MsPac and Pac converge with ghosts chasing
            300: (function(){

                // bounce animation when ghosts bump heads
                var inkyBounceX =  [ 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
                var inkyBounceY =  [-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1];
                var pinkyBounceX = [ 0, 0, 0, 0,-1, 0,-1, 0, 0,-1, 0,-1, 0,-1, 0, 0,-1, 0,-1, 0,-1, 0, 0,-1, 0,-1, 0,-1, 0, 0];
                var pinkyBounceY = [ 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0,-1, 0,-1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0];
                var inkyBounceFrame = 0;
                var pinkyBounceFrame = 0;
                var inkyBounceFrameLen = inkyBounceX.length;
                var pinkyBounceFrameLen = pinkyBounceX.length;

                // ramp animation for players
                var rampX = [0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1];
                var rampY = [0, 0,-1,-1,-1, 0, 0, 0, 0, 0, 0, 0, 0];
                var rampFrame = 0;
                var rampFrameLen = rampX.length;

                // climbing
                var climbFrame = 0;

                // meeting
                var meetFrame = 0;

                var ghostMode;
                var GHOST_RUN = 0;
                var GHOST_BUMP = 1;

                var playerMode;
                var PLAYER_RUN = 0;
                var PLAYER_RAMP = 1;
                var PLAYER_CLIMB = 2;
                var PLAYER_MEET = 3;
                     
                return {
                    init: function() {
                        // reset frames
                        inkyBounceFrame = pinkyBounceFrame = rampFrame = climbFrame = meetFrame = 0;

                        // set modes
                        ghostMode = GHOST_RUN;
                        playerMode = PLAYER_RUN;

                        // set initial positions and directions
                        mspac.setPos(-8,143);
                        mspac.setDir(DIR_RIGHT);

                        pinky.setPos(-81,143);
                        pinky.faceDirEnum = DIR_RIGHT;
                        pinky.setDir(DIR_RIGHT);

                        pac.setPos(223+8+3,142);
                        pac.setDir(DIR_LEFT);

                        inky.setPos(302,143);
                        inky.faceDirEnum = DIR_LEFT;
                        inky.setDir(DIR_LEFT);

                        // set ghost speed
                        inky.getNumSteps = pinky.getNumSteps = function() {
                            return "11211212"[this.frames%8];
                        };
                    },
                    update: function() {
                        var j;

                        // update players
                        if (playerMode == PLAYER_RUN) {
                            for (j=0; j<2; j++) {
                                pac.update(j);
                                mspac.update(j);
                            }
                            if (mspac.pixel.x == 102) {
                                playerMode++;
                            }
                        }
                        else if (playerMode == PLAYER_RAMP) {
                            pac.pixel.x -= rampX[rampFrame];
                            pac.pixel.y += rampY[rampFrame];
                            pac.commitPos();
                            mspac.pixel.x += rampX[rampFrame];
                            mspac.pixel.y += rampY[rampFrame];
                            mspac.commitPos();
                            rampFrame++;
                            if (rampFrame == rampFrameLen) {
                                playerMode++;
                            }
                        }
                        else if (playerMode == PLAYER_CLIMB) {
                            if (climbFrame == 0) {
                                // set initial climb state for mspac
                                mspac.pixel.y -= 2;
                                mspac.commitPos();
                                mspac.setDir(DIR_UP);
                            }
                            else {
                                for (j=0; j<2; j++) {
                                    mspac.update(j);
                                }
                            }
                            climbFrame++;
                            if (mspac.pixel.y == 91) {
                                playerMode++;
                            }
                        }
                        else if (playerMode == PLAYER_MEET) {
                            if (meetFrame == 0) {
                                // set initial meet state for mspac
                                mspac.pixel.y++;
                                mspac.setDir(DIR_RIGHT);
                                mspac.commitPos();
                            }
                            if (meetFrame > 18) {
                                // pause player frames after a certain period
                                mspac.frames--;
                            }
                            if (meetFrame == 78) {
                                exit();
                            }
                            meetFrame++;
                        }
                        pac.frames++;
                        mspac.frames++;

                        // update ghosts
                        if (ghostMode == GHOST_RUN) {
                            for (j=0; j<2; j++) {
                                inky.update(j);
                                pinky.update(j);
                            }

                            // stop at middle
                            inky.pixel.x = Math.max(120, inky.pixel.x);
                            inky.commitPos();
                            pinky.pixel.x = Math.min(105, pinky.pixel.x);
                            pinky.commitPos();

                            if (pinky.pixel.x == 105) {
                                ghostMode++;
                            }
                        }
                        else if (ghostMode == GHOST_BUMP) {
                            if (inkyBounceFrame < inkyBounceFrameLen) {
                                inky.pixel.x += inkyBounceX[inkyBounceFrame];
                                inky.pixel.y += inkyBounceY[inkyBounceFrame];
                            }
                            if (pinkyBounceFrame < pinkyBounceFrameLen) {
                                pinky.pixel.x += pinkyBounceX[pinkyBounceFrame];
                                pinky.pixel.y += pinkyBounceY[pinkyBounceFrame];
                            }
                            inkyBounceFrame++;
                            pinkyBounceFrame++;
                        }
                        inky.frames++;
                        pinky.frames++;
                    },
                    draw: function() {
                        renderer.blitMap();
                        renderer.beginMapClip();
                        renderer.renderFunc(function(ctx) {
                            if (playerMode <= PLAYER_RAMP) {
                                drawPlayer(ctx,pac);
                            }
                            drawPlayer(ctx,mspac);
                        });
                        if (inkyBounceFrame < inkyBounceFrameLen) {
                            renderer.drawGhost(inky);
                        }
                        if (pinkyBounceFrame < pinkyBounceFrameLen) {
                            renderer.drawGhost(pinky);
                        }
                        if (playerMode == PLAYER_MEET) {
                            renderer.renderFunc(function(ctx) {
                                drawHeartSprite(ctx, 112, 73);
                            });
                        }
                        renderer.endMapClip();
                    },
                }; // returned object
            })(), // trigger at 300
        }, // triggers
    }); // returned object
})(); // mspacCutscene1

var cutscenes = [
    [pacmanCutscene1], // GAME_PACMAN
    [mspacmanCutscene1, mspacmanCutscene2], // GAME_MSPACMAN
    [cookieCutscene1, cookieCutscene2], // GAME_COOKIE
    [mspacmanCutscene1, mspacmanCutscene2], // GAME_OTTO
];

var isInCutScene = function() {
    var scenes = cutscenes[gameMode];
    var i,len = scenes.length;
    for (i=0; i<len; i++) {
        if (state == scenes[i]) {
            return true;
        }
    }
    return false;
};

// TODO: no cutscene after board 17 (last one after completing board 17)
var triggerCutsceneAtEndLevel = function() {
    if (gameMode == GAME_PACMAN) {
        if (level == 2) {
            playCutScene(pacmanCutscene1, readyNewState);
            return true;
        }
        /*
        else if (level == 5) {
            playCutScene(pacmanCutscene2, readyNewState);
            return true;
        }
        else if (level >= 9 && (level-9)%4 == 0) {
            playCutScene(pacmanCutscene3, readyNewState);
            return true;
        }
        */
    }
    else if (gameMode == GAME_MSPACMAN || gameMode == GAME_OTTO) {
        if (level == 2) {
            playCutScene(mspacmanCutscene1, readyNewState);
            return true;
        }
        else if (level == 5) {
            playCutScene(mspacmanCutscene2, readyNewState);
            return true;
        }
    }
    else if (gameMode == GAME_COOKIE) {
        if (level == 2) {
            playCutScene(cookieCutscene1, readyNewState);
            return true;
        }
        else if (level == 5) {
            playCutScene(cookieCutscene2, readyNewState);
            return true;
        }
    }

    // no cutscene triggered
    return false;
};

