function hideClass(name) {
       var myClasses = document.querySelectorAll(name),
      i = 0,
      l = myClasses.length;

      for (i; i < l; i++) {
        myClasses[i].style.display = 'none';
      }
	}
    // Copyright (c) 2023 The Chromium Authors. All rights reserved. Adaptation done by Elizalde Alexios
    // Use of this source code is governed by a BSD-style license that can be
    // found in the LICENSE file.
    (function() {
    'use strict';
    /**
    * T-Rex runner.
    * @param {string} outerContainerId Outer containing element id.
    * @param {object} opt_config
    * @constructor
    * @export
    */
    function Runner(outerContainerId, opt_config) {
    // Singleton
    if (Runner.instance_) {
    return Runner.instance_;
    }
    Runner.instance_ = this;
    this.outerContainerEl = document.querySelector(outerContainerId);
    this.containerEl = null;
    this.detailsButton = this.outerContainerEl.querySelector('#details-button');
    this.config = opt_config || Runner.config;
    this.dimensions = Runner.defaultDimensions;
    this.canvas = null;
    this.canvasCtx = null;
    this.tRex = null;
    this.distanceMeter = null;
    this.distanceRan = 0;
    this.highestScore = 0;
    this.time = 0;
    this.runningTime = 0;
    this.stamina = this.config.STAMINA_MAX;
    this.sprintKeyHeld = false;
    this.sprintExhausted = false;
    this.speedBoostActive = false;
    this.companionGap = 0;
    this.companionXPos = 2;
    this.companionDrawX = 2;
    this.cloneAnimationTime = 0;
    this.cloneSourceX = 0;
    this.clonePressurePoints = 0;
    this.powerUp = null;
    this.hasPowerUp = false;
    this.storedPowerUpType = null;
    this.powerUpProjectile = null;
    this.cloneStunRemaining = 0;
    this.cloneFrozenX = null;
    this.cloneFrozenSourceX = 0;
    this.cloneSlowStacks = 0;
    this.blueVaccinesCollected = 0;
    this.hasVirusShield = false;
    this.cloneBlueFlashRemaining = 0;
    this.cloneHealth = this.config.CLONE_MAX_HEALTH;
    this.cloneDefeated = false;
    this.gameMode = 'normal';
    this.nextPowerUpDistance = 80;
    this.msPerFrame = 1000 / FPS;
    this.currentSpeed = this.config.SPEED;
    this.obstacles = [];
    this.started = false;
    this.activated = false;
    this.crashed = false;
    this.paused = false;
    this.resizeTimerId_ = null;
    this.playCount = 0;
    // Sound FX.
    this.audioBuffer = null;
    this.soundFx = {};
    this.footstepTime = 0;
    this.footstepSide = false;
    // Global web audio context for playing sounds.
    this.audioContext = null;
    // Images.
    this.images = {};
    this.imagesLoaded = 0;
    this.loadImages();
    }
    window['Runner'] = Runner;
    /**
    * Default game width.
    * @const
    */
    var DEFAULT_WIDTH = 600;
    /**
    * Frames per second.
    * @const
    */
    var FPS = 60;
    /** @const */
    var IS_HIDPI = window.devicePixelRatio > 1;
    /** @const */
    var IS_IOS =
    window.navigator.userAgent.indexOf('UIWebViewForStaticFileContent') > -1;
    /** @const */
    var IS_MOBILE = window.navigator.userAgent.indexOf('Mobi') > -1 || IS_IOS;
    /** @const */
    var IS_TOUCH_ENABLED = 'ontouchstart' in window;
    /**
    * Default game configuration.
    * @enum {number}
    */
    Runner.config = {
    SOUND_ENABLED: false,
    FOOTSTEP_SOUNDS: false,
    ACCELERATION: 0.0027,
    BG_CLOUD_SPEED: 0.2,
    BOTTOM_PAD: 10,
    CLEAR_TIME: 3000,
    CLOUD_FREQUENCY: 0.5,
    GAMEOVER_CLEAR_TIME: 750,
    GAP_COEFFICIENT: 0.85,
    GRAVITY: 0.6,
    INITIAL_JUMP_VELOCITY: 12,
    MAX_CLOUDS: 6,
    MAX_OBSTACLE_LENGTH: 3,
    MAX_SPEED: 7.5,
    MIN_JUMP_HEIGHT: 35,
    MOBILE_SPEED_COEFFICIENT: 1.2,
    RESOURCE_TEMPLATE_ID: 'audio-resources',
    SPEED: 4.05,
    SPEED_BOOST: 4.5,
    SPEED_DROP_COEFFICIENT: 3,
    SPRINT_MAX_SPEED: 10,
    SPRINT_RECOVERY: 6,
    STAMINA_DRAIN: 50,
    STAMINA_MAX: 100,
    STAMINA_REGEN: 14,
    CLONE_BASE_SPEED: 0.012,
    CLONE_DISTANCE_SPEED_RATE: 0.00014,
    CLONE_DISTANCE_SPEED_CAP: 0.05,
    CLONE_PRESSURE_PER_HIT: 25,
    CLONE_PRESSURE_RECOVERY: 0.2,
    CLONE_SPEED_PER_LOST_POINT: 0.0003,
    CLONE_MAX_PENALTY_SPEED: 0.025,
    POWER_UP_MIN_GAP: 90,
    POWER_UP_MAX_GAP: 170,
    POWER_UP_SIZE: 14,
    POWER_UP_OBSTACLE_CLEARANCE: 100,
    POWER_UP_PROJECTILE_SPEED: 0.38,
    POWER_UP_STUN_DURATION: 2500,
    POWER_UP_BLUE_CHANCE: 0.3,
    POWER_UP_RED_CHANCE: 0.45,
    // Starter blue syringe, available only in Dev mode.
    POWER_UP_SLOW_PER_STACK: 0.15,
    BLUE_VACCINES_FOR_SHIELD: 3,
    MAX_CLONE_SLOW_STACKS: 3,
    POWER_UP_BLUE_FLASH_DURATION: 700,
    CLONE_MAX_HEALTH: 3
    };
    /**
    * Default dimensions.
    * @enum {string}
    */
    Runner.defaultDimensions = {
    WIDTH: DEFAULT_WIDTH,
    HEIGHT: 150
    };
    /**
    * CSS class names.
    * @enum {string}
    */
    Runner.classes = {
    CANVAS: 'runner-canvas',
    CONTAINER: 'runner-container',
    CRASHED: 'crashed',
    ICON: 'icon-offline',
    TOUCH_CONTROLLER: 'controller'
    };
    /**
    * Image source urls.
    * @enum {array.<object>}
    */
    Runner.imageSources = {
    LDPI: [
    {name: 'THROW', id: 'paciente-throw-sprite'},
    {name: 'SHIELD_ACTIVATION', id: 'paciente-shield-sprite'},
    {name: 'WALL_PICTURE', id: 'wall-picture'},
    {name: 'CLONE', id: 'clone-sprite'},
    {name: 'HYPER_CLONE', id: 'hyper-clone-sprite'},
    {name: 'EXIT_DOOR', id: 'exit-door-sprite'},
    {name: 'GROUND', id: 'corridor-scenery'},
    {name: 'WHEELCHAIR', id: 'obstacle-wheelchair'},
    {name: 'VIRUS', id: 'obstacle-virus'},
{name: 'IV_STAND', id: 'obstacle-iv'},
    {name: 'CLOUD', id: '1x-cloud'},
    {name: 'HORIZON', id: '1x-horizon'},
    {name: 'RESTART', id: '1x-restart'},
    {name: 'TEXT_SPRITE', id: '1x-text'},
    {name: 'TREX', id: 'gulosin-sprite'}
    ],
    HDPI: [
    {name: 'THROW', id: 'paciente-throw-sprite'},
    {name: 'SHIELD_ACTIVATION', id: 'paciente-shield-sprite'},
    {name: 'WALL_PICTURE', id: 'wall-picture'},
    {name: 'CLONE', id: 'clone-sprite'},
    {name: 'HYPER_CLONE', id: 'hyper-clone-sprite'},
    {name: 'EXIT_DOOR', id: 'exit-door-sprite'},
    {name: 'GROUND', id: 'corridor-scenery'},
    {name: 'WHEELCHAIR', id: 'obstacle-wheelchair'},
    {name: 'VIRUS', id: 'obstacle-virus'},
{name: 'IV_STAND', id: 'obstacle-iv'},
    {name: 'CLOUD', id: '2x-cloud'},
    {name: 'HORIZON', id: '2x-horizon'},
    {name: 'RESTART', id: '2x-restart'},
    {name: 'TEXT_SPRITE', id: '2x-text'},
    {name: 'TREX', id: 'gulosin-sprite'}
    ]
    };
    /**
    * Sound FX. Reference to the ID of the audio tag on interstitial page.
    * @enum {string}
    */
    Runner.sounds = {
    BUTTON_PRESS: 'offline-sound-press',
    HIT: 'offline-sound-hit',
    SCORE: 'offline-sound-reached',
    THROW: 'sound-throw',
    VACCINE_PICKUP: 'sound-vaccine-pickup',
    VACCINE_HIT: 'sound-vaccine-hit',
    STEP_ONE: 'sound-step-one',
    STEP_TWO: 'sound-step-two'
    };
    /**
    * Key code mapping.
    * @enum {object}
    */
    Runner.keycodes = {
    JUMP: {'38': 1, '32': 1}, // Up, spacebar
    DUCK: {'40': 1}, // Down
    SPEED_UP: {'39': 1}, // Right
    POWER_UP: {'37': 1}, // Left
    RESTART: {'13': 1} // Enter
    };
    /**
    * Runner event names.
    * @enum {string}
    */
    Runner.events = {
    ANIM_END: 'webkitAnimationEnd',
    CLICK: 'click',
    KEYDOWN: 'keydown',
    KEYUP: 'keyup',
    MOUSEDOWN: 'mousedown',
    MOUSEUP: 'mouseup',
    RESIZE: 'resize',
    TOUCHEND: 'touchend',
    TOUCHSTART: 'touchstart',
    VISIBILITY: 'visibilitychange',
    BLUR: 'blur',
    FOCUS: 'focus',
    LOAD: 'load'
    };
    Runner.prototype = {
    /**
    * Setting individual settings for debugging.
    * @param {string} setting
    * @param {*} value
    */
    updateConfigSetting: function(setting, value) {
    if (setting in this.config && value != undefined) {
    this.config[setting] = value;
    switch (setting) {
    case 'GRAVITY':
    case 'MIN_JUMP_HEIGHT':
    case 'SPEED_DROP_COEFFICIENT':
    this.tRex.config[setting] = value;
    break;
    case 'INITIAL_JUMP_VELOCITY':
    this.tRex.setJumpVelocity(value);
    break;
    case 'SPEED':
    this.setSpeed(value);
    break;
    }
    }
    },
    /**
    * Load and cache the image assets from the page.
    */
    loadImages: function() {
    this.vaccineImages = {
    yellow: document.getElementById('vaccine-yellow'),
    blue: document.getElementById('vaccine-blue'),
    red: document.getElementById('vaccine-green')
    };
    var imageSources = IS_HIDPI ? Runner.imageSources.HDPI :
    Runner.imageSources.LDPI;
    var numImages = imageSources.length;
    for (var i = numImages - 1; i >= 0; i--) {
    var imgSource = imageSources[i];
    this.images[imgSource.name] = document.getElementById(imgSource.id);
    }
    this.init();
    },
    /**
    * Load and decode base 64 encoded sounds.
    */
    loadSounds: function() {
    if (!this.config.SOUND_ENABLED) return;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
    this.audioContext = this.audioContext || new AudioContextClass();
    var resourceTemplate =
    document.getElementById(this.config.RESOURCE_TEMPLATE_ID).content;
    for (var sound in Runner.sounds) {
    var soundSrc =
    resourceTemplate.getElementById(Runner.sounds[sound]).src;
    soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
    var buffer = decodeBase64ToArrayBuffer(soundSrc);
    // Async, so no guarantee of order in array.
    this.audioContext.decodeAudioData(buffer, function(index, audioData) {
    this.soundFx[index] = audioData;
    }.bind(this, sound), function() {});
    }
    }
    },
    /**
    * Sets the game speed. Adjust the speed accordingly if on a smaller screen.
    * @param {number} opt_speed
    */
    setSpeed: function(opt_speed) {
    var speed = opt_speed || this.currentSpeed;
    // Reduce the speed on smaller mobile screens.
    if (this.dimensions.WIDTH < DEFAULT_WIDTH) {
    var mobileSpeed = speed * this.dimensions.WIDTH / DEFAULT_WIDTH *
    this.config.MOBILE_SPEED_COEFFICIENT;
    this.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
    } else if (opt_speed) {
    this.currentSpeed = opt_speed;
    }
    },
    /** Only Infinite mode can accelerate without a speed cap. */
    getNormalMaxSpeed: function() {
    return this.gameMode === 'infinite' ? Infinity : this.config.MAX_SPEED;
    },
    /**
    * Game initialiser.
    */
    init: function() {
    // Hide the static icon.
    //document.querySelector('.' + Runner.classes.ICON).style.visibility = 'hidden';
    this.adjustDimensions();
    this.setSpeed();
    this.containerEl = document.createElement('div');
    this.containerEl.className = Runner.classes.CONTAINER;
    this.containerEl.appendChild(document.getElementById('transformation-impact'));
    // Player canvas container.
    this.canvas = createCanvas(this.containerEl, this.dimensions.WIDTH,
    this.dimensions.HEIGHT, Runner.classes.PLAYER);
    this.canvasCtx = this.canvas.getContext('2d');
    this.canvasCtx.fillStyle = '#f7f7f7';
    this.canvasCtx.fill();
    Runner.updateCanvasScaling(this.canvas);
    // Horizon contains clouds, obstacles and the ground.
    this.horizon = new Horizon(this.canvas, this.images, this.dimensions,
    this.config.GAP_COEFFICIENT);
    // Distance meter
    this.distanceMeter = new DistanceMeter(this.canvas,
    this.images.TEXT_SPRITE, this.dimensions.WIDTH);
    // Draw t-rex
    this.tRex = new Trex(this.canvas, this.images.TREX);
    this.outerContainerEl.appendChild(this.containerEl);
    if (IS_MOBILE) {
    this.createTouchController();
    }
    this.startListening();
    this.update();
    window.addEventListener(Runner.events.RESIZE,
    this.debounceResize.bind(this));
    },
    /**
    * Create the touch controller. A div that covers whole screen.
    */
    createTouchController: function() {
    this.touchController = document.createElement('div');
    this.touchController.className = Runner.classes.TOUCH_CONTROLLER;
    },
    /**
    * Debounce the resize event.
    */
    debounceResize: function() {
    if (!this.resizeTimerId_) {
    this.resizeTimerId_ =
    setInterval(this.adjustDimensions.bind(this), 250);
    }
    },
    /**
    * Adjust game space dimensions on resize.
    */
    adjustDimensions: function() {
    clearInterval(this.resizeTimerId_);
    this.resizeTimerId_ = null;
    var boxStyles = window.getComputedStyle(this.outerContainerEl);
    var padding = Number(boxStyles.paddingLeft.substr(0,
    boxStyles.paddingLeft.length - 2));
    this.dimensions.WIDTH = this.outerContainerEl.offsetWidth - padding * 2;
    // Redraw the elements back onto the canvas.
    if (this.canvas) {
    this.canvas.width = this.dimensions.WIDTH;
    this.canvas.height = this.dimensions.HEIGHT;
    Runner.updateCanvasScaling(this.canvas);
    this.distanceMeter.calcXPos(this.dimensions.WIDTH);
    this.clearCanvas();
    this.horizon.update(0, 0, true);
    this.tRex.update(0);
    // Outer container and distance meter.
    if (this.activated || this.crashed) {
    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
    this.containerEl.style.height = this.dimensions.HEIGHT + 'px';
    this.distanceMeter.update(0, Math.ceil(this.distanceRan));
    } else {
    this.tRex.draw(0, 0);
    }
    // Game over panel.
    if (this.crashed && !this.cloneDefeated && this.gameOverPanel) {
    this.gameOverPanel.updateDimensions(this.dimensions.WIDTH);
    this.gameOverPanel.draw();
    }
    }
    },
    /**
    * Play the game intro.
    * Canvas container width expands out to the full width.
    */
    playIntro: function() {
    if (!this.started && !this.crashed) {
    this.playingIntro = true;
    this.tRex.playingIntro = true;
    this.containerEl.style.width = this.dimensions.WIDTH + 'px';
    if (this.touchController) {
    this.outerContainerEl.appendChild(this.touchController);
    }
    this.activated = true;
    this.started = true;
    // A versão antiga aguardava o evento webkitAnimationEnd, que não é
    // disparado de forma consistente nos navegadores atuais.
    this.tRex.xPos = this.tRex.config.START_X_POS;
    this.startGame();
    } else if (this.crashed) {
    this.restart();
    }
    },
    /**
    * Update the game status to started.
    */
    startGame: function() {
    this.runningTime = 0;
    this.playingIntro = false;
    this.tRex.playingIntro = false;
    this.containerEl.style.webkitAnimation = '';
    this.playCount++;
    // Handle tabbing off the page. Pause the current game.
    window.addEventListener(Runner.events.VISIBILITY,
    this.onVisibilityChange.bind(this));
    window.addEventListener(Runner.events.BLUR,
    this.onVisibilityChange.bind(this));
    window.addEventListener(Runner.events.FOCUS,
    this.onVisibilityChange.bind(this));
    },
    clearCanvas: function() {
    this.canvasCtx.clearRect(0, 0, this.dimensions.WIDTH,
    this.dimensions.HEIGHT);
    },
    /**
    * Update the game frame.
    */
    update: function() {
    this.drawPending = false;
    var now = getTimeStamp();
    var deltaTime = now - (this.time || now);
    this.time = now;
    if (this.deathRemaining > 0) {
    this.deathRemaining = Math.max(0, this.deathRemaining - deltaTime);
    this.drawDeathCamera();
    if (this.deathRemaining === 0) {
    document.getElementById('virocrata-death').hidden = true;
    this.startEscape();
    } else this.raq();
    return;
    }
    if (this.impactRemaining > 0) {
    this.impactRemaining = Math.max(0, this.impactRemaining - deltaTime);
    if (this.impactRemaining === 0) {
    document.getElementById('transformation-impact').hidden = true;
    this.showCriticalJumpscare();
    }
    this.raq();
    return;
    }
    if (this.jumpscareRemaining > 0) {
    this.jumpscareRemaining = Math.max(0, this.jumpscareRemaining - deltaTime);
    this.cloneStunRemaining = this.jumpscareRemaining;
    if (this.jumpscareRemaining === 0) {
    document.getElementById('critical-jumpscare').hidden = true;
    if (this.cloneFrozenX !== null) {
    this.companionXPos = this.cloneFrozenX + this.companionGap;
    this.companionDrawX = this.cloneFrozenX;
    this.cloneFrozenX = null;
    }
    }
    this.raq();
    return;
    }
    if (this.escapeActive) {
    this.updateEscape(Math.min(deltaTime, 50));
    return;
    }
    if (this.activated) {
    this.updateStamina(deltaTime);
    this.updateFootsteps(deltaTime);
    this.clearCanvas();
    if (this.tRex.jumping) {
    this.tRex.updateJump(deltaTime, this.config);
    }
    this.runningTime += deltaTime;
    var hasObstacles = this.runningTime > this.config.CLEAR_TIME;
    // First jump triggers the intro.
    if (this.tRex.jumpCount == 1 && !this.playingIntro) {
    this.playIntro();
    }
    // The horizon doesn't move until the intro is over.
    this.horizon.reservedPowerUp = this.powerUp;
    if (this.playingIntro) {
    this.horizon.update(0, this.currentSpeed, hasObstacles);
    } else {
    deltaTime = !this.started ? 0 : deltaTime;
    this.horizon.update(deltaTime, this.currentSpeed, hasObstacles);
    }
    // Check for collisions.
    var collision = hasObstacles &&
    checkForCollision(this.horizon.obstacles[0], this.tRex);
    if (!collision) {
    var distanceGained = this.currentSpeed * deltaTime / this.msPerFrame;
    this.distanceRan += distanceGained;
    var pointsGained = distanceGained * DistanceMeter.config.COEFFICIENT;
    this.clonePressurePoints = Math.max(0, this.clonePressurePoints -
    pointsGained * this.config.CLONE_PRESSURE_RECOVERY);
    if (this.currentSpeed < this.getNormalMaxSpeed()) {
    this.currentSpeed = Math.min(this.getNormalMaxSpeed(),
    this.currentSpeed + this.config.ACCELERATION * deltaTime / this.msPerFrame);
    }
    } else {
    // A colisao aumenta a pressao da perseguicao sem alterar o placar.
    this.clonePressurePoints += this.config.CLONE_PRESSURE_PER_HIT;
    this.currentSpeed = Math.max(this.config.SPEED * 0.5,
    this.currentSpeed * 0.55);
    this.horizon.obstacles.shift();
    }
    if (this.distanceMeter.getActualDistance(this.distanceRan) >
    this.distanceMeter.maxScore) {
    this.distanceRan = 0;
    }
    var playAcheivementSound = this.distanceMeter.update(deltaTime,
    Math.ceil(this.distanceRan));
    if (playAcheivementSound) {
    this.playSound(this.soundFx.SCORE);
    }
    }
    if (!this.crashed) {
    this.tRex.update(deltaTime);
    this.updatePowerUp(deltaTime);
    if (this.jumpscareRemaining > 0) {
    this.raq();
    return;
    }
    this.drawCompanion(deltaTime);
    if (!this.crashed) {
    this.drawStaminaBar();
    this.drawCloneHealth();
    this.drawPowerUpIndicator();
    this.raq();
    }
    }
    },
    /**
    * Draw a decorative companion behind the player. It has no collision box.
    */
    drawCompanion: function(deltaTime) {
    if (this.cloneDefeated) {
    return;
    }
    var sourceX = 0;
    if (this.cloneStunRemaining > 0) {
    sourceX = this.cloneFrozenSourceX;
    } else if (this.activated) {
    this.cloneAnimationTime = (this.cloneAnimationTime + deltaTime) %
    (80 * 8);
    sourceX = Math.floor(this.cloneAnimationTime / 80) * 97;
    }
    this.cloneSourceX = sourceX;
    var initialX = 2;
    var offscreenX = -Trex.config.WIDTH;
    var offscreenSpeedMultiplier = 1.15;
    var targetX = Math.max(initialX, this.tRex.xPos - Trex.config.WIDTH + 2);
    var companionX = this.companionXPos;
    var chaseSpeed = 0;
    if (this.started && this.cloneStunRemaining <= 0) {
    var distance = this.distanceMeter.getActualDistance(this.distanceRan);
    chaseSpeed = Math.min(this.config.CLONE_DISTANCE_SPEED_CAP,
    this.config.CLONE_BASE_SPEED + distance *
    this.config.CLONE_DISTANCE_SPEED_RATE);
    chaseSpeed += Math.min(this.config.CLONE_MAX_PENALTY_SPEED,
    this.clonePressurePoints * this.config.CLONE_SPEED_PER_LOST_POINT);
    chaseSpeed *= Math.pow(1 - this.config.POWER_UP_SLOW_PER_STACK,
    this.cloneSlowStacks);
    var currentX = this.companionXPos - this.companionGap;
    if (currentX <= offscreenX && this.cloneSlowStacks === 0) {
    chaseSpeed *= offscreenSpeedMultiplier;
    }
    this.companionXPos = Math.min(targetX,
    this.companionXPos + chaseSpeed * deltaTime);
    companionX = this.companionXPos;
    } else if (!this.started) {
    this.companionXPos = initialX;
    }
    if (this.cloneStunRemaining <= 0 && this.started &&
    this.speedBoostActive) {
    var maximumGap = Math.max(0, this.companionXPos - offscreenX);
    this.companionGap = Math.min(maximumGap,
    this.companionGap + deltaTime * 0.12);
    } else if (this.cloneStunRemaining <= 0) {
    this.companionGap = Math.max(0,
    this.companionGap - deltaTime * (0.008 + chaseSpeed * 0.25));
    }
    if (this.cloneStunRemaining > 0 && this.cloneFrozenX !== null) {
    companionX = this.cloneFrozenX;
    } else {
    companionX = Math.max(offscreenX, companionX - this.companionGap);
    this.companionDrawX = companionX;
    }
    if (this.started && this.cloneStunRemaining <= 0 &&
    companionX + Trex.config.WIDTH >= this.tRex.xPos) {
    if (this.absorbVirusCapture()) {
    companionX = this.cloneFrozenX;
    } else {
    this.gameOver();
    return;
    }
    }
    var cloneSize = 100;
    var cloneDrawX = companionX + Trex.config.WIDTH - cloneSize;
    var cloneDrawY = this.tRex.groundYPos + Trex.config.HEIGHT - cloneSize;
    this.canvasCtx.save();
    this.canvasCtx.imageSmoothingEnabled = false;
    var cloneImage = this.cloneHealth === 1 ? this.images.HYPER_CLONE : this.images.CLONE;
    this.canvasCtx.drawImage(cloneImage, sourceX, 0, 97, 97,
    cloneDrawX, cloneDrawY, cloneSize, cloneSize);
    this.canvasCtx.restore();
    if (this.cloneStunRemaining > 0) {
    this.canvasCtx.strokeStyle = '#facc15';
    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.strokeRect(cloneDrawX - 2, cloneDrawY - 2,
    cloneSize + 4, cloneSize + 4);
    } else if (this.cloneBlueFlashRemaining > 0) {
    this.canvasCtx.strokeStyle = '#38bdf8';
    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.strokeRect(cloneDrawX - 2, cloneDrawY - 2,
    cloneSize + 4, cloneSize + 4);
    }
    // Mantem a barreira totalmente fora da borda esquerda do canvas.
    var barrierX = -10;
    this.canvasCtx.fillStyle = '#f59e0b';
    this.canvasCtx.fillRect(barrierX,
    this.tRex.groundYPos - 12, 10, 59);
    },
    /** The third blue pickup activates the special animation and one shield. */
    collectBlueVaccine: function() {
    if (this.blueVaccinesCollected >= this.config.BLUE_VACCINES_FOR_SHIELD) return;
    this.blueVaccinesCollected++;
    if (this.blueVaccinesCollected === this.config.BLUE_VACCINES_FOR_SHIELD) {
    this.hasVirusShield = true;
    this.tRex.shieldAnimationTime = 0;
    this.tRex.throwAnimationTime = null;
    }
    },
    absorbVirusCapture: function() {
    if (!this.hasVirusShield) return false;
    this.hasVirusShield = false;
    this.blueVaccinesCollected = 0;
    // Consuming the player's shield does not remove vaccine hits on the clone.
    this.companionXPos = -Trex.config.WIDTH;
    this.companionGap = 0;
    this.companionDrawX = this.companionXPos;
    this.cloneFrozenX = this.companionXPos;
    this.cloneFrozenSourceX = this.cloneSourceX;
    this.cloneStunRemaining = 1000;
    return true;
    },
    /** Update, collect and draw the yellow cube power-up. */
    updatePowerUp: function(deltaTime) {
    if (!this.started) {
    return;
    }
    if (this.cloneStunRemaining > 0) {
    var frozenWorldMovement = (this.currentSpeed * FPS / 1000) * deltaTime;
    this.cloneFrozenX -= frozenWorldMovement;
    this.companionDrawX = this.cloneFrozenX;
    this.cloneStunRemaining = Math.max(0,
    this.cloneStunRemaining - deltaTime);
    if (this.cloneStunRemaining === 0 && this.cloneFrozenX !== null) {
    this.companionXPos = this.cloneFrozenX + this.companionGap;
    this.companionDrawX = this.cloneFrozenX;
    this.cloneFrozenX = null;
    }
    }
    if (this.cloneBlueFlashRemaining > 0) {
    this.cloneBlueFlashRemaining = Math.max(0,
    this.cloneBlueFlashRemaining - deltaTime);
    }
    var size = this.config.POWER_UP_SIZE;
    var distance = this.distanceMeter.getActualDistance(this.distanceRan);
    var movement = this.horizon.obstacleMovement || 0;
    if (!this.powerUp && !this.hasPowerUp && !this.powerUpProjectile &&
    distance >= this.nextPowerUpDistance &&
    this.isPowerUpPositionClear(this.dimensions.WIDTH - movement)) {
    var elevated = Math.random() > 0.5;
    var powerUpRoll = Math.random();
    var redChance = this.gameMode !== 'infinite' ?
    this.config.POWER_UP_RED_CHANCE : 0;
    var powerUpType = powerUpRoll < redChance ?
    'red' : (powerUpRoll < redChance +
    this.config.POWER_UP_BLUE_CHANCE ? 'blue' : 'yellow');
    this.powerUp = {
    x: this.dimensions.WIDTH,
    y: this.tRex.groundYPos + Trex.config.HEIGHT - size -
    (elevated ? 50 : 0),
    type: powerUpType
    };
    }
    if (this.powerUp) {
    this.powerUp.x -= movement;
    var playerLeft = this.tRex.xPos;
    var playerTop = this.tRex.yPos;
    if (playerLeft < this.powerUp.x + size &&
    playerLeft + Trex.config.WIDTH > this.powerUp.x &&
    playerTop < this.powerUp.y + size &&
    playerTop + Trex.config.HEIGHT > this.powerUp.y) {
    this.hasPowerUp = true;
    this.storedPowerUpType = this.powerUp.type;
    if (this.powerUp.type === 'blue') {
    this.collectBlueVaccine();
    }
    this.powerUp = null;
    this.scheduleNextPowerUp(distance);
    this.playSound(this.soundFx.VACCINE_PICKUP, 0.018, 0.12, 1.2);
    } else if (this.powerUp.x + size < 0) {
    this.powerUp = null;
    this.scheduleNextPowerUp(distance);
    }
    }
    if (this.powerUp) {
    this.drawPowerUpVaccine(this.powerUp.x, this.powerUp.y, size,
    this.powerUp.type);
    }
    if (this.powerUpProjectile) {
    this.powerUpProjectile.x -= this.config.POWER_UP_PROJECTILE_SPEED *
    deltaTime;
    var cloneLeft = this.companionDrawX;
    var cloneIsVisible = !this.cloneDefeated &&
    cloneLeft + Trex.config.WIDTH > 0 &&
    cloneLeft < this.dimensions.WIDTH;
    if (cloneIsVisible &&
    this.powerUpProjectile.x < cloneLeft + Trex.config.WIDTH &&
    this.powerUpProjectile.x + size > cloneLeft &&
    this.powerUpProjectile.y < this.tRex.groundYPos + Trex.config.HEIGHT &&
    this.powerUpProjectile.y + size > this.tRex.groundYPos) {
    if (this.powerUpProjectile.type === 'red') {
    this.cloneHealth = Math.max(0, this.cloneHealth - 1);
    if (this.cloneHealth === 1 && !this.jumpscareShown) {
    this.jumpscareShown = true;
    // Seventeen GIF frames, 110 ms each; the asset has no animation loop.
    this.jumpscareRemaining = 1870;
    this.cloneStunRemaining = this.jumpscareRemaining;
    this.cloneFrozenX = this.companionDrawX;
    this.cloneFrozenSourceX = this.cloneSourceX;
    resetMobileControls();
    var impactX = this.companionDrawX + Trex.config.WIDTH - 100;
    var impactY = this.tRex.groundYPos + Trex.config.HEIGHT - 100;
    if (impactX + 100 > 0 && impactX < this.dimensions.WIDTH && impactY + 100 > 0 && impactY < this.dimensions.HEIGHT) {
    var impact = document.getElementById('transformation-impact');
    impact.style.left = impactX + 'px';
    impact.style.top = impactY + 'px';
    impact.src = 'frame_impact.gif?play=' + getTimeStamp();
    impact.hidden = false;
    this.impactRemaining = 280;
    } else this.showCriticalJumpscare();
    }
    if (this.cloneHealth === 0) {
    this.cloneDefeated = true;
    this.cloneStunRemaining = 0;
    this.cloneFrozenX = null;
    this.powerUpProjectile = null;
    this.gameOver(true);
    return;
    }
    } else if (this.powerUpProjectile.type === 'blue') {
    this.cloneSlowStacks = Math.min(this.config.MAX_CLONE_SLOW_STACKS,
    this.cloneSlowStacks + 1);
    this.cloneBlueFlashRemaining =
    this.config.POWER_UP_BLUE_FLASH_DURATION;
    } else {
    this.cloneStunRemaining = this.config.POWER_UP_STUN_DURATION;
    this.cloneFrozenX = this.companionDrawX;
    this.cloneFrozenSourceX = this.cloneSourceX;
    }
    this.powerUpProjectile = null;
    this.playSound(this.soundFx.VACCINE_HIT, 0.015, 0.09, 0.8);
    } else if (this.powerUpProjectile.x + size < 0) {
    this.powerUpProjectile = null;
    }
    }
    if (this.powerUpProjectile) {
    this.drawPowerUpVaccine(this.powerUpProjectile.x,
    this.powerUpProjectile.y, size, this.powerUpProjectile.type);
    }
    },
    showCriticalJumpscare: function() {
    document.getElementById('critical-jumpscare-image').src = 'mega_jumps-once.gif?play=' + getTimeStamp();
    document.getElementById('critical-jumpscare').hidden = false;
    },
    /** Reserve room for the full syringe sprite and a safe approach. */
    isPowerUpPositionClear: function(x) {
    var size = this.config.POWER_UP_SIZE;
    var margin = this.config.POWER_UP_OBSTACLE_CLEARANCE;
    return this.horizon.obstacles.every(function(obstacle) {
    return x + size * 1.5 + margin <= obstacle.xPos ||
    x - size * 0.5 - margin >= obstacle.xPos + obstacle.width;
    });
    },
    /** Choose the score at which another cube may appear. */
    scheduleNextPowerUp: function(distance) {
    this.nextPowerUpDistance = distance + getRandomNum(
    this.config.POWER_UP_MIN_GAP, this.config.POWER_UP_MAX_GAP);
    },
    /** Draw the syringe, cropping the empty margins of the 64px assets. */
    drawPowerUpVaccine: function(x, y, size, type) {
    var vaccine = this.vaccineImages[type];
    if (!vaccine || !vaccine.complete || !vaccine.naturalWidth) return;
    var width = size * 2;
    var height = Math.max(6, Math.round(width * 3 / 23));
    var drawX = Math.round(x + (size - width) / 2);
    var drawY = Math.round(y + (size - height) / 2);
    this.canvasCtx.save();
    this.canvasCtx.imageSmoothingEnabled = false;
    this.canvasCtx.drawImage(vaccine, 21, 33, 23, 3,
    drawX, drawY, width, height);
    // Only the liquid occupies source pixels x=27..34, y=34.
    if (type === 'red') {
    var liquidLeft = Math.round(width * 6 / 23);
    var liquidRight = Math.round(width * 14 / 23);
    this.canvasCtx.fillStyle = '#22c55e';
    this.canvasCtx.fillRect(drawX + liquidLeft,
    drawY + height / 3, liquidRight - liquidLeft, height / 3);
    }
    this.canvasCtx.restore();
    },
    /** Keep the HUD in screen pixels so text stays crisp as the scene scales. */
    getHud: function() {
    if (!this.hud) {
    this.hud = {};
    ['game-hud', 'hud-stamina', 'hud-special', 'hud-slow', 'hud-held',
    'hud-enemy-label', 'hud-health-track', 'hud-health', 'hud-score'].forEach(function(id) {
    this.hud[id] = document.getElementById(id);
    }, this);
    }
    return this.hud;
    },
    /** Update enemy health or the infinite mode score without crowding the HUD. */
    drawCloneHealth: function() {
    var hud = this.getHud();
    var infinite = this.gameMode === 'infinite';
    hud['hud-enemy-label'].textContent = this.cloneDefeated ? 'Vírus derrotado' :
    (infinite ? 'Pontos' : 'Virocrata-19');
    hud['hud-health-track'].hidden = infinite || this.cloneDefeated;
    hud['hud-health'].style.width =
    (100 * this.cloneHealth / this.config.CLONE_MAX_HEALTH) + '%';
    hud['hud-score'].hidden = !infinite;
    hud['hud-score'].textContent = this.distanceMeter.getActualDistance(this.distanceRan) +
    '\nRecorde ' + this.distanceMeter.getActualDistance(this.highestScore);
    },
    /** Update the special and slow counters; keep the shield around the player. */
    drawPowerUpIndicator: function() {
    var hud = this.getHud();
    hud['hud-special'].textContent = this.hasVirusShield ? 'ATIVO' :
    this.blueVaccinesCollected + '/' + this.config.BLUE_VACCINES_FOR_SHIELD;
    hud['hud-special'].classList.toggle('is-active', this.hasVirusShield);
    hud['hud-slow'].textContent = 'x' + this.cloneSlowStacks;
    hud['hud-held'].hidden = !this.hasPowerUp;
    hud['hud-held'].textContent = '← ' + (this.storedPowerUpType === 'blue' ? 'Azul' :
    (this.storedPowerUpType === 'yellow' ? 'Amarela' : 'Verde'));
    hud['hud-held'].style.color = this.storedPowerUpType === 'blue' ? '#67d8ff' :
    (this.storedPowerUpType === 'yellow' ? '#fcd875' : '#86efac');
    if (this.hasVirusShield) {
    this.canvasCtx.save();
    this.canvasCtx.strokeStyle = '#38bdf8';
    this.canvasCtx.lineWidth = 2;
    this.canvasCtx.beginPath();
    this.canvasCtx.ellipse(this.tRex.xPos + Trex.config.WIDTH / 2,
    this.tRex.yPos + Trex.config.HEIGHT / 2,
    Trex.config.WIDTH / 2 + 5, Trex.config.HEIGHT / 2 + 5,
    0, 0, Math.PI * 2);
    this.canvasCtx.stroke();
    this.canvasCtx.restore();
    }
    },
    /** Throw the stored cube backwards toward the clone. */
    throwPowerUp: function(opt_devShot) {
    var devShot = opt_devShot === true && this.gameMode === 'dev';
    if ((!this.hasPowerUp && !devShot) || this.powerUpProjectile || !this.started) {
    return;
    }
    if (!devShot) this.hasPowerUp = false;
    this.powerUpProjectile = {
    x: this.tRex.xPos - this.config.POWER_UP_SIZE,
    y: (devShot ? this.tRex.groundYPos : this.tRex.yPos) + Math.floor(Trex.config.HEIGHT / 2),
    type: devShot ? 'red' : this.storedPowerUpType
    };
    this.tRex.throwAnimationTime = 0;
    if (!devShot) this.storedPowerUpType = null;
    this.playSound(this.soundFx.THROW, 0.012, 0.08, 1);
    },
    /** Update the sprint energy and its temporary speed bonus. */
    updateStamina: function(deltaTime) {
    var seconds = deltaTime / 1000;
    this.speedBoostActive = this.sprintKeyHeld && !this.tRex.jumping &&
    !this.sprintExhausted && this.stamina > 0;
    if (this.speedBoostActive) {
    this.stamina = Math.max(0,
    this.stamina - this.config.STAMINA_DRAIN * seconds);
    var sprintMaxSpeed = this.gameMode === 'infinite' ? Infinity :
    this.config.SPRINT_MAX_SPEED;
    this.currentSpeed = Math.min(sprintMaxSpeed,
    this.currentSpeed + this.config.SPEED_BOOST * seconds);
    if (this.stamina === 0) {
    this.sprintExhausted = true;
    this.speedBoostActive = false;
    }
    } else {
    this.stamina = Math.min(this.config.STAMINA_MAX,
    this.stamina + this.config.STAMINA_REGEN * seconds);
    var normalMaxSpeed = this.getNormalMaxSpeed();
    if (this.currentSpeed > normalMaxSpeed) {
    this.currentSpeed = Math.max(normalMaxSpeed,
    this.currentSpeed - this.config.SPRINT_RECOVERY * seconds);
    }
    }
    },
    /** Draw a compact continuous stamina bar in the shared HUD. */
    drawStaminaBar: function() {
    var hud = this.getHud();
    hud['game-hud'].hidden = isStartMenuOpen() || this.crashed;
    document.body.classList.toggle('critical-scene', this.cloneHealth === 1 && !hud['game-hud'].hidden);
    hud['hud-stamina'].style.width =
    (100 * Math.max(0, Math.min(1, this.stamina / this.config.STAMINA_MAX))) + '%';
    hud['hud-stamina'].style.backgroundColor = this.stamina > 30 ? '#35d4b2' : '#f7c65b';
    },
    /**
    * Event handler.
    */
    handleEvent: function(e) {
    return (function(evtType, events) {
    switch (evtType) {
    case events.KEYDOWN:
    case events.TOUCHSTART:
    case events.MOUSEDOWN:
    this.onKeyDown(e);
    break;
    case events.KEYUP:
    case events.TOUCHEND:
    case events.MOUSEUP:
    this.onKeyUp(e);
    break;
    }
    }.bind(this))(e.type, Runner.events);
    },
    /**
    * Bind relevant key / mouse / touch listeners.
    */
    startListening: function() {
    // Keys.
    document.addEventListener(Runner.events.KEYDOWN, this);
    document.addEventListener(Runner.events.KEYUP, this);
    if (IS_MOBILE) {
    // Mobile only touch devices.
    this.touchController.addEventListener(Runner.events.TOUCHSTART, this);
    this.touchController.addEventListener(Runner.events.TOUCHEND, this);
    this.containerEl.addEventListener(Runner.events.TOUCHSTART, this);
    } else {
    // Mouse.
    document.addEventListener(Runner.events.MOUSEDOWN, this);
    document.addEventListener(Runner.events.MOUSEUP, this);
    }
    },
    /**
    * Remove all listeners.
    */
    stopListening: function() {
    document.removeEventListener(Runner.events.KEYDOWN, this);
    document.removeEventListener(Runner.events.KEYUP, this);
    if (IS_MOBILE) {
    this.touchController.removeEventListener(Runner.events.TOUCHSTART, this);
    this.touchController.removeEventListener(Runner.events.TOUCHEND, this);
    this.containerEl.removeEventListener(Runner.events.TOUCHSTART, this);
    } else {
    document.removeEventListener(Runner.events.MOUSEDOWN, this);
    document.removeEventListener(Runner.events.MOUSEUP, this);
    }
    },
    /**
    * Process keydown.
    * @param {Event} e
    */
    onKeyDown: function(e) {
    if (this.deathRemaining > 0) return;
    if (this.jumpscareRemaining > 0) return;
    if (this.escapeActive) {
    if (e.key === 'ArrowRight' || e.keyCode === 39) { e.preventDefault(); mobileAction('run', true); }
    if (Runner.keycodes.JUMP[String(e.keyCode)]) { e.preventDefault(); mobileAction('jump', true); }
    return;
    }
    if (isStartMenuOpen()) return;
    if (this.gameMode === 'dev' && this.started && !this.crashed && !this.paused) {
    var devKey = (e.key || '').toLowerCase();
    var devVaccine = devKey === 'm' || e.code === 'KeyM' || e.keyCode === 77;
    var devShield = devKey === 'n' || e.code === 'KeyN' || e.keyCode === 78;
    if (devVaccine || devShield) {
    e.preventDefault();
    if (e.repeat) return;
    if (devVaccine) {
    this.throwPowerUp(true);
    } else {
    this.blueVaccinesCollected = this.config.BLUE_VACCINES_FOR_SHIELD - 1;
    this.collectBlueVaccine();
    this.drawPowerUpIndicator();
    }
    return;
    }
    }
    if (e.target != this.detailsButton) {
    if (!this.crashed && (Runner.keycodes.JUMP[String(e.keyCode)] ||
    e.type == Runner.events.TOUCHSTART)) {
    if (!this.activated) {
    this.loadSounds();
    this.activated = true;
    }
    if (!this.tRex.jumping) {
    this.playSound(this.soundFx.BUTTON_PRESS);
    this.tRex.startJump();
    }
    }
    if (this.crashed && e.type == Runner.events.TOUCHSTART &&
    e.currentTarget == this.containerEl) {
    this.restart();
    }
    }
    // Speed drop, activated only when jump key is not pressed.
    if (Runner.keycodes.DUCK[e.keyCode] && this.tRex.jumping) {
    e.preventDefault();
    this.tRex.setSpeedDrop();
    }
    var isSpeedUp = Runner.keycodes.SPEED_UP[e.keyCode] ||
    e.key === 'ArrowRight';
    if (isSpeedUp && this.started &&
    !this.crashed) {
    e.preventDefault();
    this.sprintKeyHeld = true;
    }
    var isPowerUp = Runner.keycodes.POWER_UP[String(e.keyCode)] ||
    e.key === 'ArrowLeft';
    if (isPowerUp && !this.crashed) {
    e.preventDefault();
    this.throwPowerUp();
    }
    },
    /**
    * Process key up.
    * @param {Event} e
    */
    onKeyUp: function(e) {
    if (this.escapeActive) {
    if (e.key === 'ArrowRight' || e.keyCode === 39) mobileAction('run', false);
    if (Runner.keycodes.JUMP[String(e.keyCode)]) mobileAction('jump', false);
    return;
    }
    if (isStartMenuOpen()) return;
    var keyCode = String(e.keyCode);
    var isSpeedUp = Runner.keycodes.SPEED_UP[keyCode] ||
    e.key === 'ArrowRight';
    if (isSpeedUp) {
    e.preventDefault();
    this.sprintKeyHeld = false;
    this.sprintExhausted = false;
    this.speedBoostActive = false;
    return;
    }
    var isjumpKey = Runner.keycodes.JUMP[keyCode] ||
    e.type == Runner.events.TOUCHEND ||
    e.type == Runner.events.MOUSEDOWN;
    if (this.isRunning() && isjumpKey) {
    this.tRex.endJump();
    } else if (Runner.keycodes.DUCK[keyCode]) {
    this.tRex.speedDrop = false;
    } else if (this.crashed) {
    // Check that enough time has elapsed before allowing jump key to restart.
    var deltaTime = getTimeStamp() - this.time;
    if (Runner.keycodes.RESTART[keyCode] ||
    (e.type == Runner.events.MOUSEUP && e.target == this.canvas) ||
    (deltaTime >= this.config.GAMEOVER_CLEAR_TIME &&
    Runner.keycodes.JUMP[keyCode])) {
    this.restart();
    }
    } else if (this.paused && isjumpKey) {
    this.play();
    }
    },
    /**
    * RequestAnimationFrame wrapper.
    */
    raq: function() {
    if (!this.drawPending) {
    this.drawPending = true;
    this.raqId = requestAnimationFrame(this.update.bind(this));
    }
    },
    /**
    * Whether the game is running.
    * @return {boolean}
    */
    isRunning: function() {
    return !!this.raqId;
    },
    /**
    * Game over state.
    */
    gameOver: function(won) {
    this.impactRemaining = 0;
    document.getElementById('transformation-impact').hidden = true;
    this.jumpscareRemaining = 0;
    document.getElementById('critical-jumpscare').hidden = true;
    if (this.crashed) {
    return;
    }
    won = won === true;
    this.playSound(won ? this.soundFx.SCORE : this.soundFx.HIT);
    if (!won) {
    vibrate(200);
    }
    this.stop();
    this.crashed = true;
    this.sprintKeyHeld = false;
    this.speedBoostActive = false;
    this.distanceMeter.acheivement = false;
    if (!won) {
    this.tRex.update(100, Trex.status.CRASHED);
    // Game over panel.
    if (!this.gameOverPanel) {
    this.gameOverPanel = new GameOverPanel(this.canvas,
    this.images.TEXT_SPRITE, this.images.RESTART,
    this.dimensions);
    } else {
    this.gameOverPanel.draw();
    }
    }
    // Update the high score.
    if (this.gameMode === 'infinite' && this.distanceRan > this.highestScore) {
    this.highestScore = Math.ceil(this.distanceRan);
    this.distanceMeter.setHighScore(this.highestScore);
    }
    // Reset the time clock.
    this.time = getTimeStamp();
    if (won && this.cloneHealth === 0 && (this.gameMode === 'normal' || this.gameMode === 'dev')) {
    this.deathRemaining = 2400;
    this.deathRemainsX = this.companionDrawX + Trex.config.WIDTH - 100;
    document.getElementById('game-hud').hidden = true;
    mobileControls.hidden = true;
    document.getElementById('virocrata-death').hidden = false;
    this.drawDeathCamera();
    this.raq();
    } else if (won) this.startEscape();
    else showGameOverScreen(false, this.distanceMeter.getActualDistance(this.distanceRan));
    },
    drawDeathCamera: function() {
    var camera = document.getElementById('virocrata-death-camera');
    var width = window.innerWidth;
    var height = window.innerHeight;
    if (camera.width !== width) camera.width = width;
    if (camera.height !== height) camera.height = height;
    var ctx = camera.getContext('2d');
    var elapsed = 2400 - this.deathRemaining;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var progress = Math.min(1, elapsed / 900);
    if (reducedMotion) progress = 1;
    progress = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    var endScale = Math.min(width / 160, height / 140);
    var startScale = endScale * 0.78;
    var scale = startScale + (endScale - startScale) * progress;
    var bossX = this.companionDrawX + Trex.config.WIDTH - 50;
    var bossY = this.tRex.groundYPos + Trex.config.HEIGHT - 50;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(width * 0.42, height * 0.5);
    ctx.scale(scale, scale);
    ctx.translate(-bossX, -bossY);
    var remainsOpacity = Math.max(0, Math.min(1, (elapsed - 1400) / 160));
    if (reducedMotion) remainsOpacity = elapsed >= 1400 ? 1 : 0;
    var deathImage = document.getElementById('death-sprite');
    var remainsImage = document.getElementById('virocrata-remains');
    var deathReady = deathImage && deathImage.complete && deathImage.naturalWidth > 0;
    var remainsReady = remainsImage && remainsImage.complete && remainsImage.naturalWidth > 0;
    if (!remainsReady) remainsOpacity = 0;
    if (remainsOpacity < 1) {
    var frame = Math.min(13, Math.floor(elapsed / 100));
    ctx.globalAlpha = 1 - remainsOpacity;
    var deathFallback = deathReady ? deathImage : this.images.HYPER_CLONE;
    if (deathFallback && deathFallback.complete && deathFallback.naturalWidth > 0) {
    ctx.drawImage(deathFallback, deathReady ? frame * 97 : 0, 0, 97, 97,
    bossX - 50, bossY - 50, 100, 100);
    }
    }
    if (remainsOpacity > 0) {
    ctx.globalAlpha = remainsOpacity;
    ctx.drawImage(document.getElementById('virocrata-remains'), bossX - 50, bossY - 50, 100, 100);
    }
    ctx.restore();
    },
    /** A quiet exit sequence, separate from gameplay and collision updates. */
    startEscape: function() {
    this.escapeActive = true;
    this.escapeElapsed = 0;
    this.escapePlayerTime = 0;
    document.getElementById('mobile-run').textContent = 'andar...';
    this.escapeDoorTime = 0;
    this.escapeEntering = null;
    this.escapeStartX = this.tRex.xPos;
    this.escapeWalkDistance = 0;
    this.escapeCamera = 0;
    this.escapeRestore = 0;
    this.escapeLongWalk = this.gameMode === 'normal' || this.gameMode === 'dev';
    this.escapePathLength = 1500;
    this.escapeReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.paused = false;
    this.tRex.reset();
    this.tRex.throwAnimationTime = null;
    this.tRex.shieldAnimationTime = null;
    this.tRex.update(0, Trex.status.RUNNING);
    document.getElementById('game-hud').hidden = true;
    mobileControls.hidden = false;
    gameOverScreen.classList.add('is-hidden');
    document.body.classList.add('critical-scene');
    document.body.classList.add('escape-scene');
    document.getElementById('escape-light').hidden = true;
    document.getElementById('escape-light').style.opacity = '0';
    document.getElementById('escape-status').textContent = 'Vá até a luz. Segure andar... ou a seta → para caminhar.';
    this.updateEscape(0);
    },
    updateEscape: function(deltaTime) {
    this.escapeElapsed += deltaTime;
    var duration = this.escapeReducedMotion ? 1200 : 2200;
    var ctx = this.canvasCtx;
    var doorX = this.dimensions.WIDTH - 100;
    if (this.escapeLongWalk) {
    var previousCamera = this.escapeCamera;
    if (this.escapeEntering === null && this.sprintKeyHeld) {
    this.escapeWalkDistance = Math.min(this.escapePathLength, this.escapeWalkDistance + deltaTime * 0.13);
    }
    var cameraLead = Math.max(0, Math.min(160, this.dimensions.WIDTH - 200 - this.escapeStartX));
    this.escapeCamera = Math.max(0, this.escapeWalkDistance - cameraLead);
    this.horizon.horizonLine.corridorTravel += this.escapeCamera - previousCamera;
    this.tRex.xPos = this.escapeStartX + this.escapeWalkDistance - this.escapeCamera;
    doorX = this.escapeStartX + this.escapePathLength - this.escapeCamera;
    var restoreProgress = Math.min(1, this.escapeWalkDistance / (this.escapePathLength * 0.95));
    this.escapeRestore = restoreProgress * restoreProgress * (3 - 2 * restoreProgress);
    if (this.escapeRestore === 1) document.body.classList.remove('critical-scene');
    }
    if (this.escapeEntering === null) {
    if (this.sprintKeyHeld && !this.escapeLongWalk) this.tRex.xPos = Math.min(doorX, this.tRex.xPos + deltaTime * 0.13);
    if (this.tRex.jumping) this.tRex.updateJump(deltaTime, this.config);
    if (this.sprintKeyHeld && this.tRex.xPos >= doorX && !this.tRex.jumping) {
    this.escapeEntering = 0;
    resetMobileControls();
    mobileControls.hidden = true;
    document.getElementById('escape-light').hidden = false;
    document.getElementById('escape-status').textContent = 'Você atravessa a porta.';
    }
    } else {
    this.escapeEntering += deltaTime;
    this.tRex.xPos = doorX;
    }
    var elapsed = this.escapeEntering === null ? 0 : this.escapeEntering;
    var ground = this.horizon.horizonLine.yPos;
    this.escapeDoorX = doorX;
    this.clearCanvas();
    this.horizon.horizonLine.draw();
    var remains = document.getElementById('virocrata-remains');
    if (this.deathRemainsX != null && remains && remains.complete && remains.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(document.getElementById('virocrata-remains'),
    this.deathRemainsX - this.escapeCamera, this.tRex.groundYPos + Trex.config.HEIGHT - 100, 100, 100);
    ctx.restore();
    }
    ctx.save();
    doorX = Math.round(doorX);
    ctx.imageSmoothingEnabled = false;
    var glow = ctx.createRadialGradient(doorX + 21, ground - 30, 4, doorX + 21, ground - 30, 65);
    glow.addColorStop(0, 'rgba(235, 250, 255, 0.42)');
    glow.addColorStop(0.55, 'rgba(220, 240, 245, 0.12)');
    glow.addColorStop(1, 'rgba(220, 240, 245, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(doorX - 44, ground - 95, 130, 118);
    // Play the supplied automatic door once as the patient approaches.
    if (doorX - this.tRex.xPos <= 240 || this.escapeDoorTime > 0) {
    this.escapeDoorTime = Math.min(1690, this.escapeDoorTime + deltaTime);
    }
    var doorFrame = Math.min(12, Math.floor(this.escapeDoorTime / 130));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(doorX - 14, ground - 70, 70, 70);
    ctx.drawImage(this.images.EXIT_DOOR, doorFrame * 100, 0, 100, 100,
    doorX - 14, ground - 70, 70, 70);
    // Exit sign is drawn in canvas pixels to stay aligned with the doorway.
    ctx.fillStyle = '#d7e4e7';
    ctx.fillRect(doorX + 4, ground - 82, 34, 11);
    ctx.fillStyle = '#36695f';
    ctx.fillRect(doorX + 5, ground - 81, 32, 9);
    ctx.fillStyle = '#f1fff8';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SAÍDA', doorX + 21, ground - 74);
    var floorLight = ctx.createLinearGradient(0, ground, 0, ground + 23);
    floorLight.addColorStop(0, 'rgba(240, 253, 255, 0.4)');
    floorLight.addColorStop(1, 'rgba(240, 253, 255, 0)');
    ctx.fillStyle = floorLight;
    ctx.beginPath();
    ctx.moveTo(doorX + 3, ground + 1);
    ctx.lineTo(doorX + 39, ground + 1);
    ctx.lineTo(doorX + 59, ground + 23);
    ctx.lineTo(doorX - 17, ground + 23);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1 - Math.min(1, elapsed / 600);
    if (this.sprintKeyHeld && this.escapeEntering === null) this.escapePlayerTime += deltaTime;
    var walkFrame = Math.floor(this.escapePlayerTime / 200) % 3;
    var walkScale = this.tRex.config.HEIGHT / 59;
    var exitPlayer = document.getElementById('exit-player-sprite');
    if (exitPlayer && exitPlayer.complete && exitPlayer.naturalWidth > 0) {
    // Crop only the character, excluding the isolated pixel in the GIF margin.
    ctx.drawImage(exitPlayer, walkFrame * 97 + 20, 24, 24, 59,
    this.tRex.xPos + this.tRex.config.WIDTH / 2 - 11 * walkScale,
    this.tRex.yPos, 24 * walkScale, this.tRex.config.HEIGHT);
    } else this.tRex.draw(94, 0);
    ctx.restore();
    var fade = this.escapeReducedMotion ? elapsed / duration : (elapsed - 300) / 1600;
    document.getElementById('escape-light').style.opacity = Math.max(0, Math.min(1, fade));
    if (elapsed >= duration) {
    this.escapeActive = false;
    this.stop();
    document.body.classList.remove('escape-scene');
    document.body.classList.remove('critical-scene');
    if (this.gameMode === 'normal' || this.gameMode === 'dev') window.normalEnding.open();
    else showGameOverScreen(true, this.distanceMeter.getActualDistance(this.distanceRan));
    document.getElementById('escape-light').hidden = true;
    } else this.raq();
    },
    stop: function() {
    resetMobileControls();
    this.activated = false;
    this.paused = true;
    cancelAnimationFrame(this.raqId);
    this.raqId = 0;
    this.drawPending = false;
    },
    play: function() {
    if (isStartMenuOpen()) return;
    if (this.activated && !this.paused && this.isRunning()) return;
    if (!this.crashed) {
    cancelAnimationFrame(this.raqId);
    this.activated = true;
    this.paused = false;
    this.tRex.update(0, Trex.status.RUNNING);
    this.time = getTimeStamp();
    this.update();
    }
    },
    restart: function() {
    this.deathRemainsX = null;
    if (this.deathRemaining > 0) this.stop();
    this.deathRemaining = 0;
    document.getElementById('virocrata-death').hidden = true;
    this.impactRemaining = 0;
    document.getElementById('transformation-impact').hidden = true;
    this.jumpscareRemaining = 0;
    this.jumpscareShown = false;
    document.getElementById('critical-jumpscare').hidden = true;
    if (this.escapeActive) {
    this.escapeActive = false;
    this.stop();
    document.getElementById('escape-light').hidden = true;
    }
    if (!this.raqId) {
    hideGameOverScreen();
    this.playCount++;
    this.runningTime = 0;
    this.stamina = this.config.STAMINA_MAX;
    this.sprintKeyHeld = false;
    this.sprintExhausted = false;
    this.speedBoostActive = false;
    this.companionGap = 0;
    this.companionXPos = 2;
    this.companionDrawX = 2;
    this.cloneAnimationTime = 0;
    this.cloneSourceX = 0;
    this.clonePressurePoints = 0;
    this.powerUp = null;
    this.hasPowerUp = false;
    this.storedPowerUpType = null;
    this.powerUpProjectile = null;
    this.cloneStunRemaining = 0;
    this.cloneFrozenX = null;
    this.cloneFrozenSourceX = 0;
    this.cloneSlowStacks = 0;
    this.blueVaccinesCollected = 0;
    this.hasVirusShield = false;
    this.cloneBlueFlashRemaining = 0;
    this.cloneHealth = this.config.CLONE_MAX_HEALTH;
    this.cloneDefeated = false;
    this.nextPowerUpDistance = getRandomNum(60, 100);
    this.activated = true;
    this.paused = false;
    this.crashed = false;
    this.distanceRan = 0;
    this.setSpeed(this.config.SPEED);
    this.time = getTimeStamp();
    this.containerEl.classList.remove(Runner.classes.CRASHED);
    this.clearCanvas();
    this.distanceMeter.reset(this.highestScore);
    this.horizon.reset();
    this.tRex.xPos = this.tRex.config.START_X_POS;
    this.tRex.shieldAnimationTime = null;
    this.tRex.throwAnimationTime = null;
    this.tRex.reset();
    this.playSound(this.soundFx.BUTTON_PRESS);
    this.update();
    }
    },
    /**
    * Pause the game if the tab is not in focus.
    */
    onVisibilityChange: function(e) {
    if (this.escapeActive || this.deathRemaining > 0) {
    if (document.hidden || document.webkitHidden || e.type === 'blur') this.stop();
    else {
    this.paused = false;
    this.time = getTimeStamp();
    this.raq();
    }
    return;
    }
    if (document.hidden || document.webkitHidden || e.type == 'blur') {
    this.stop();
    } else {
    this.play();
    }
    },
    /**
    * Play a sound.
    * @param {SoundBuffer} soundBuffer
    */
    updateFootsteps: function(deltaTime) {
    if (!this.config.FOOTSTEP_SOUNDS || !this.started || this.crashed ||
    this.paused || this.tRex.jumping) {
    this.footstepTime = 0;
    return;
    }
    this.footstepTime += deltaTime;
    var interval = this.speedBoostActive ? 160 : 260;
    if (this.footstepTime >= interval) {
    this.footstepTime %= interval;
    this.footstepSide = !this.footstepSide;
    this.playSound(this.footstepSide ? this.soundFx.STEP_ONE :
    this.soundFx.STEP_TWO, 0.015);
    }
    },
    playSound: function(soundBuffer, volume, duration, rate) {
    if (!this.config.SOUND_ENABLED) return;
    if (soundBuffer && this.audioContext) {
    if (this.audioContext.state === 'suspended') {
    this.audioContext.resume().catch(function() {});
    }
    var sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = soundBuffer;
    if (rate) sourceNode.playbackRate.value = rate;
    var gain = this.audioContext.createGain();
    gain.gain.value = volume === undefined ?
    (soundBuffer === this.soundFx.BUTTON_PRESS ? 0.02 : 0.05) : volume;
    if (duration) {
    var now = this.audioContext.currentTime;
    var peak = gain.gain.value;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.01);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    }
    sourceNode.connect(gain);
    gain.connect(this.audioContext.destination);
    sourceNode.start(0);
    // Web Audio requires start() before scheduling stop().
    if (duration) sourceNode.stop(now + duration);
    }
    }
    };
    /**
    * Updates the canvas size taking into
    * account the backing store pixel ratio and
    * the device pixel ratio.
    *
    * See article by Paul Lewis:
    * https://www.html5rocks.com/en/tutorials/canvas/hidpi/
    *
    * @param {HTMLCanvasElement} canvas
    * @param {number} opt_width
    * @param {number} opt_height
    * @return {boolean} Whether the canvas was scaled.
    */
    Runner.updateCanvasScaling = function(canvas, opt_width, opt_height) {
    var context = canvas.getContext('2d');
    // Match both screen density and the CSS enlargement of the game.
    var devicePixelRatio = window.devicePixelRatio || 1;
    var ratio = Math.max(1, devicePixelRatio * (Runner.displayScale || 1));
    var oldWidth = opt_width || canvas.width;
    var oldHeight = opt_height || canvas.height;
    canvas.width = Math.ceil(oldWidth * ratio);
    canvas.height = Math.ceil(oldHeight * ratio);
    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';
    // Scale the context to counter the fact that we've manually scaled
    // our canvas element.
    context.scale(canvas.width / oldWidth, canvas.height / oldHeight);
    return ratio !== 1;
    };
    /**
    * Get random number.
    * @param {number} min
    * @param {number} max
    * @param {number}
    */
    function getRandomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
    * Vibrate on mobile devices.
    * @param {number} duration Duration of the vibration in milliseconds.
    */
    function vibrate(duration) {
    if (IS_MOBILE && window.navigator.vibrate) {
    window.navigator.vibrate(duration);
    }
    }
    /**
    * Create canvas element.
    * @param {HTMLElement} container Element to append canvas to.
    * @param {number} width
    * @param {number} height
    * @param {string} opt_classname
    * @return {HTMLCanvasElement}
    */
    function createCanvas(container, width, height, opt_classname) {
    var canvas = document.createElement('canvas');
    canvas.className = opt_classname ? Runner.classes.CANVAS + ' ' +
    opt_classname : Runner.classes.CANVAS;
    canvas.width = width;
    canvas.height = height;
    container.appendChild(canvas);
    return canvas;
    }
    /**
    * Decodes the base 64 audio to ArrayBuffer used by Web Audio.
    * @param {string} base64String
    */
    function decodeBase64ToArrayBuffer(base64String) {
    var len = (base64String.length / 4) * 3;
    var str = atob(base64String);
    var arrayBuffer = new ArrayBuffer(len);
    var bytes = new Uint8Array(arrayBuffer);
    for (var i = 0; i < len; i++) {
    bytes[i] = str.charCodeAt(i);
    }
    return bytes.buffer;
    }
    /**
    * Return the current timestamp.
    * @return {number}
    */
    function getTimeStamp() {
    return IS_IOS ? new Date().getTime() : performance.now();
    }
    //******************************************************************************
    /**
    * Game over panel.
    * @param {!HTMLCanvasElement} canvas
    * @param {!HTMLImage} textSprite
    * @param {!HTMLImage} restartImg
    * @param {!Object} dimensions Canvas dimensions.
    * @constructor
    */
    function GameOverPanel(canvas, textSprite, restartImg, dimensions) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.canvasDimensions = dimensions;
    this.textSprite = textSprite;
    this.restartImg = restartImg;
    this.draw();
    };
    /**
    * Dimensions used in the panel.
    * @enum {number}
    */
    GameOverPanel.dimensions = {
    TEXT_X: 0,
    TEXT_Y: 13,
    TEXT_WIDTH: 191,
    TEXT_HEIGHT: 11,
    RESTART_WIDTH: 36,
    RESTART_HEIGHT: 32
    };
    GameOverPanel.prototype = {
    /**
    * Update the panel dimensions.
    * @param {number} width New canvas width.
    * @param {number} opt_height Optional new canvas height.
    */
    updateDimensions: function(width, opt_height) {
    this.canvasDimensions.WIDTH = width;
    if (opt_height) {
    this.canvasDimensions.HEIGHT = opt_height;
    }
    },
    /**
    * Draw the panel.
    */
    draw: function() {
    var dimensions = GameOverPanel.dimensions;
    var centerX = this.canvasDimensions.WIDTH / 2;
    // Game over text.
    var textSourceX = dimensions.TEXT_X;
    var textSourceY = dimensions.TEXT_Y;
    var textSourceWidth = dimensions.TEXT_WIDTH;
    var textSourceHeight = dimensions.TEXT_HEIGHT;
    var textTargetX = Math.round(centerX - (dimensions.TEXT_WIDTH / 2));
    var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
    var textTargetWidth = dimensions.TEXT_WIDTH;
    var textTargetHeight = dimensions.TEXT_HEIGHT;
    var restartSourceWidth = dimensions.RESTART_WIDTH;
    var restartSourceHeight = dimensions.RESTART_HEIGHT;
    var restartTargetX = centerX - (dimensions.RESTART_WIDTH / 2);
    var restartTargetY = this.canvasDimensions.HEIGHT / 2;
    if (IS_HIDPI) {
    textSourceY *= 2;
    textSourceX *= 2;
    textSourceWidth *= 2;
    textSourceHeight *= 2;
    restartSourceWidth *= 2;
    restartSourceHeight *= 2;
    }
    // Game over text from sprite.
    this.canvasCtx.drawImage(this.textSprite,
    textSourceX, textSourceY, textSourceWidth, textSourceHeight,
    textTargetX, textTargetY, textTargetWidth, textTargetHeight);
    // Restart button.
    this.canvasCtx.drawImage(this.restartImg, 0, 0,
    restartSourceWidth, restartSourceHeight,
    restartTargetX, restartTargetY, dimensions.RESTART_WIDTH,
    dimensions.RESTART_HEIGHT);
    }
    };
    //******************************************************************************
    /**
    * Check for a collision.
    * @param {Obstacle|undefined} obstacle
    * @param {!Trex} tRex T-rex object.
    * @param {HTMLCanvasContext} opt_canvasCtx Optional canvas context for drawing
    * collision boxes.
    * @return {Array.<CollisionBox>}
    */
    function checkForCollision(obstacle, tRex, opt_canvasCtx) {
    // Reserving space for a vaccine can leave the horizon without obstacles.
    if (!obstacle) return false;
    // Adjustments are made to the bounding box as there is a 1 pixel white
    // border around the t-rex and obstacles.
    var tRexBox = new CollisionBox(
    tRex.xPos + 1,
    tRex.yPos + 1,
    tRex.config.WIDTH - 2,
    tRex.config.HEIGHT - 2);
    var obstacleBox = new CollisionBox(
    obstacle.xPos + 1,
    obstacle.yPos + 1,
    obstacle.typeConfig.width * obstacle.size - 2,
    obstacle.typeConfig.height - 2);
    // Debug outer box
    if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
    }
    // Simple outer bounds check.
    if (boxCompare(tRexBox, obstacleBox)) {
    var collisionBoxes = obstacle.collisionBoxes;
    var tRexCollisionBoxes = Trex.collisionBoxes;
    // Detailed axis aligned box check.
    for (var t = 0; t < tRexCollisionBoxes.length; t++) {
    for (var i = 0; i < collisionBoxes.length; i++) {
    // Adjust the box to actual positions.
    var adjTrexBox =
    createAdjustedCollisionBox(tRexCollisionBoxes[t], tRexBox);
    var adjObstacleBox =
    createAdjustedCollisionBox(collisionBoxes[i], obstacleBox);
    var crashed = boxCompare(adjTrexBox, adjObstacleBox);
    // Draw boxes for debug.
    if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
    }
    if (crashed) {
    return [adjTrexBox, adjObstacleBox];
    }
    }
    }
    }
    return false;
    };
    /**
    * Adjust the collision box.
    * @param {!CollisionBox} box The original box.
    * @param {!CollisionBox} adjustment Adjustment box.
    * @return {CollisionBox} The adjusted collision box object.
    */
    function createAdjustedCollisionBox(box, adjustment) {
    return new CollisionBox(
    box.x + adjustment.x,
    box.y + adjustment.y,
    box.width,
    box.height);
    };
    /**
    * Draw the collision boxes for debug.
    */
    function drawCollisionBoxes(canvasCtx, tRexBox, obstacleBox) {
    canvasCtx.save();
    canvasCtx.strokeStyle = '#f00';
    canvasCtx.strokeRect(tRexBox.x, tRexBox.y,
    tRexBox.width, tRexBox.height);
    canvasCtx.strokeStyle = '#0f0';
    canvasCtx.strokeRect(obstacleBox.x, obstacleBox.y,
    obstacleBox.width, obstacleBox.height);
    canvasCtx.restore();
    };
    /**
    * Compare two collision boxes for a collision.
    * @param {CollisionBox} tRexBox
    * @param {CollisionBox} obstacleBox
    * @return {boolean} Whether the boxes intersected.
    */
    function boxCompare(tRexBox, obstacleBox) {
    var crashed = false;
    var tRexBoxX = tRexBox.x;
    var tRexBoxY = tRexBox.y;
    var obstacleBoxX = obstacleBox.x;
    var obstacleBoxY = obstacleBox.y;
    // Axis-Aligned Bounding Box method.
    if (tRexBox.x < obstacleBoxX + obstacleBox.width &&
    tRexBox.x + tRexBox.width > obstacleBoxX &&
    tRexBox.y < obstacleBox.y + obstacleBox.height &&
    tRexBox.height + tRexBox.y > obstacleBox.y) {
    crashed = true;
    }
    return crashed;
    };
    //******************************************************************************
    /**
    * Collision box object.
    * @param {number} x X position.
    * @param {number} y Y Position.
    * @param {number} w Width.
    * @param {number} h Height.
    */
    function CollisionBox(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
    };
    //******************************************************************************
    /**
    * Obstacle.
    * @param {HTMLCanvasCtx} canvasCtx
    * @param {Obstacle.type} type
    * @param {image} obstacleImg Image sprite.
    * @param {Object} dimensions
    * @param {number} gapCoefficient Mutipler in determining the gap.
    * @param {number} speed
    */
    function Obstacle(canvasCtx, type, obstacleImg, dimensions,
    gapCoefficient, speed) {
    this.canvasCtx = canvasCtx;
    this.image = obstacleImg;
    this.typeConfig = type;
    this.gapCoefficient = gapCoefficient;
    this.size = getRandomNum(1, type.maxLength || Obstacle.MAX_OBSTACLE_LENGTH);
    this.dimensions = dimensions;
    this.remove = false;
    this.xPos = 0;
    this.yPos = this.typeConfig.yPos;
    this.width = 0;
    this.collisionBoxes = [];
    this.gap = 0;
    this.init(speed);
    };
    /**
    * Coefficient for calculating the maximum gap.
    * @const
    */
    Obstacle.MAX_GAP_COEFFICIENT = 2.2;
    /**
    * Maximum obstacle grouping count.
    * @const
    */
    Obstacle.MAX_OBSTACLE_LENGTH = 2,
    Obstacle.prototype = {
    /**
    * Initialise the DOM for the obstacle.
    * @param {number} speed
    */
    init: function(speed) {
    this.cloneCollisionBoxes();
    // Only allow sizing if we're at the right speed.
    if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
    this.size = 1;
    }
    this.width = this.typeConfig.width * this.size;
    this.xPos = this.dimensions.WIDTH;
    this.draw();
    // Make collision box adjustments,
    // Central box is adjusted to the size as one box.
    // ____ ______ ________
    // _| |-| _| |-| _| |-|
    // | |<->| | | |<--->| | | |<----->| |
    // | | 1 | | | | 2 | | | | 3 | |
    // |_|___|_| |_|_____|_| |_|_______|_|
    //
    if (this.size > 1) {
    this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
    this.collisionBoxes[2].width;
    this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
    }
    this.gap = this.getGap(this.gapCoefficient, speed);
    },
    /**
    * Draw and crop based on size.
    */
    draw: function() {
    // Smooth downscaled details without adding a blurred outline.
    var sprite = this.typeConfig.sprite;
    if (sprite) {
    this.canvasCtx.save();
    this.canvasCtx.imageSmoothingEnabled = true;
    this.canvasCtx.imageSmoothingQuality = 'high';
    this.canvasCtx.filter = 'none';
    for (var i = 0; i < this.size; i++) {
    this.canvasCtx.drawImage(this.image,
    sprite.x, sprite.y, sprite.width, sprite.height,
    this.xPos + i * this.typeConfig.width, this.yPos,
    this.typeConfig.width, this.typeConfig.height);
    }
    this.canvasCtx.restore();
    return;
    }
    var sourceWidth = this.typeConfig.width;
    var sourceHeight = this.typeConfig.height;
    if (IS_HIDPI) {
    sourceWidth = sourceWidth * 2;
    sourceHeight = sourceHeight * 2;
    }
    // Sprite
    var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1));
    this.canvasCtx.drawImage(this.image,
    sourceX, 0,
    sourceWidth * this.size, sourceHeight,
    this.xPos, this.yPos,
    this.typeConfig.width * this.size, this.typeConfig.height);
    },
    /**
    * Obstacle frame update.
    * @param {number} deltaTime
    * @param {number} speed
    */
    update: function(deltaTime, speed) {
    if (!this.remove) {
    this.xPos -= (speed * FPS / 1000) * deltaTime;
    this.draw();
    if (!this.isVisible()) {
    this.remove = true;
    }
    }
    },
    /**
    * Calculate a random gap size.
    * - Minimum gap gets wider as speed increses
    * @param {number} gapCoefficient
    * @param {number} speed
    * @return {number} The gap size.
    */
    getGap: function(gapCoefficient, speed) {
    // Keep time to land between jumps, including during a sprint.
    var minGap = Math.ceil(Math.max(this.width * speed +
    this.typeConfig.minGap * gapCoefficient, speed * FPS * 0.85));
    var maxGap = Math.round(minGap * Obstacle.MAX_GAP_COEFFICIENT);
    // Frequent short intervals, with occasional longer breaks.
    var spacing = Math.random();
    if (spacing < 0.65) {
    return getRandomNum(minGap, Math.round(minGap * 1.15));
    }
    if (spacing < 0.9) {
    return getRandomNum(Math.round(minGap * 1.15),
    Math.round(minGap * 1.6));
    }
    return getRandomNum(Math.round(minGap * 1.6), maxGap);
    },
    /**
    * Check if obstacle is visible.
    * @return {boolean} Whether the obstacle is in the game area.
    */
    isVisible: function() {
    return this.xPos + this.width > 0;
    },
    /**
    * Make a copy of the collision boxes, since these will change based on
    * obstacle type and size.
    */
    cloneCollisionBoxes: function() {
    var collisionBoxes = this.typeConfig.collisionBoxes;
    for (var i = collisionBoxes.length - 1; i >= 0; i--) {
    this.collisionBoxes[i] = new CollisionBox(collisionBoxes[i].x,
    collisionBoxes[i].y, collisionBoxes[i].width,
    collisionBoxes[i].height);
    }
    }
    };
    /**
    * Obstacle definitions.
    * minGap: minimum pixel space betweeen obstacles.
    * multipleSpeed: Speed at which multiples are allowed.
    */
    Obstacle.types = [
    {
    type: 'VIRUS',
    // Keep the resource key; OBSLOW3 replaces the old virus with an IV stand.
    sprite: { x: 23, y: 4, width: 62, height: 96 },
    width: 32,
    height: 50,
    yPos: 90,
    maxLength: 1,
    multipleSpeed: Infinity,
    minGap: 160,
    collisionBoxes: [
    new CollisionBox(4, 2, 16, 4),
    new CollisionBox(9, 5, 5, 44),
    new CollisionBox(15, 14, 11, 18)
    ]
    },
    {
    type: 'WHEELCHAIR',
    sprite: { x: 4, y: 0, width: 85, height: 89 },
    width: 43,
    height: 45,
    yPos: 95,
    maxLength: 1,
    multipleSpeed: Infinity,
    minGap: 160,
    collisionBoxes: [
    new CollisionBox(10, 4, 23, 21),
    new CollisionBox(3, 25, 20, 17),
    new CollisionBox(29, 16, 9, 27)
    ]
    },
    {
    type: 'IV_STAND',
    sprite: { x: 23, y: 4, width: 62, height: 96 },
    width: 32,
    height: 50,
    yPos: 90,
    maxLength: 1,
    multipleSpeed: Infinity,
    minGap: 160,
    collisionBoxes: [
    new CollisionBox(4, 2, 16, 4),
    new CollisionBox(9, 5, 5, 44),
    new CollisionBox(15, 14, 11, 18)
    ]
    }
    ];
    //******************************************************************************
    /**
    * T-rex game character.
    * @param {HTMLCanvas} canvas
    * @param {HTMLImage} image Character image.
    * @constructor
    */
    function Trex(canvas, image) {
    this.throwAnimationTime = null;
    this.shieldAnimationTime = null;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.image = image;
    this.xPos = 0;
    this.yPos = 0;
    // Position when on the ground.
    this.groundYPos = 0;
    this.currentFrame = 0;
    this.currentAnimFrames = [];
    this.blinkDelay = 0;
    this.animStartTime = 0;
    this.timer = 0;
    this.msPerFrame = 1000 / FPS;
    this.config = Trex.config;
    // Current status.
    this.status = Trex.status.WAITING;
    this.jumping = false;
    this.jumpVelocity = 0;
    this.reachedMinHeight = false;
    this.speedDrop = false;
    this.jumpCount = 0;
    this.jumpspotX = 0;
    this.init();
    };
    /**
    * T-rex player config.
    * @enum {number}
    */
    Trex.config = {
    DROP_VELOCITY: -5,
    GRAVITY: 0.6,
    HEIGHT: 47,
    THROW_FRAME_DURATION: 200,
    INIITAL_JUMP_VELOCITY: -10,
    INTRO_DURATION: 1500,
    MAX_JUMP_HEIGHT: 30,
    MIN_JUMP_HEIGHT: 30,
    SPEED_DROP_COEFFICIENT: 3,
    SPRITE_WIDTH: 262,
    START_X_POS: 130,
    WIDTH: 44
    };
    /**
    * Used in collision detection.
    * @type {Array.<CollisionBox>}
    */
    Trex.collisionBoxes = [
    new CollisionBox(1, -1, 30, 26),
    new CollisionBox(32, 0, 8, 16),
    new CollisionBox(10, 35, 14, 8),
    new CollisionBox(1, 24, 29, 5),
    new CollisionBox(5, 30, 21, 4),
    new CollisionBox(9, 34, 15, 4)
    ];
    /**
    * Animation states.
    * @enum {string}
    */
    Trex.status = {
    CRASHED: 'CRASHED',
    JUMPING: 'JUMPING',
    RUNNING: 'RUNNING',
    WAITING: 'WAITING'
    };
    /**
    * Blinking coefficient.
    * @const
    */
    Trex.BLINK_TIMING = 7000;
    /**
    * Animation config for different states.
    * @enum {object}
    */
    Trex.animFrames = {
    WAITING: {
    frames: [94, 94],
    msPerFrame: 1000 / 3
    },
    RUNNING: {
    frames: [0, 47, 94],
    msPerFrame: 40
    },
    SPRINTING: {
    frames: [141, 188, 235, 282],
    msPerFrame: 40
    },
    CRASHED: {
    frames: [94],
    msPerFrame: 1000 / 60
    },
    JUMPING: {
    frames: [0],
    msPerFrame: 1000 / 60
    }
    };
    Trex.prototype = {
    /**
    * T-rex player initaliser.
    * Sets the t-rex to blink at random intervals.
    */
    init: function() {
    this.blinkDelay = this.setBlinkDelay();
    this.groundYPos = Runner.defaultDimensions.HEIGHT - this.config.HEIGHT -
    Runner.config.BOTTOM_PAD;
    this.xPos = this.config.START_X_POS;
    this.yPos = this.groundYPos;
    this.minJumpHeight = this.groundYPos - this.config.MIN_JUMP_HEIGHT;
    this.draw(0, 0);
    this.update(0, Trex.status.WAITING);
    },
    /**
    * Setter for the jump velocity.
    * The approriate drop velocity is also set.
    */
    setJumpVelocity: function(setting) {
    this.config.INIITAL_JUMP_VELOCITY = -setting;
    this.config.DROP_VELOCITY = -setting / 2;
    },
    /**
    * Set the animation status.
    * @param {!number} deltaTime
    * @param {Trex.status} status Optional status to switch to.
    */
    update: function(deltaTime, opt_status) {
    this.timer += deltaTime;
    // Update the status.
    if (opt_status) {
    this.status = opt_status;
    this.currentFrame = 0;
    this.timer = 0;
    this.msPerFrame = Trex.animFrames[opt_status].msPerFrame;
    this.currentAnimFrames = Trex.animFrames[opt_status].frames;
    if (opt_status == Trex.status.WAITING) {
    this.animStartTime = getTimeStamp();
    this.setBlinkDelay();
    }
    }
    // The circular frames are reserved for the sprint effect.
    if (this.status === Trex.status.RUNNING) {
    var animation = Runner.instance_.speedBoostActive ?
    Trex.animFrames.SPRINTING : Trex.animFrames.RUNNING;
    if (this.currentAnimFrames !== animation.frames) {
    this.currentAnimFrames = animation.frames;
    this.msPerFrame = animation.msPerFrame;
    this.currentFrame = 0;
    this.timer = 0;
    }
    }
    // Game intro animation, T-rex moves in from the left.
    if (this.playingIntro && this.xPos < this.config.START_X_POS) {
    this.xPos += Math.round((this.config.START_X_POS /
    this.config.INTRO_DURATION) * deltaTime);
    }
    if (this.status == Trex.status.WAITING) {
    this.blink(getTimeStamp());
    } else {
    this.draw(this.currentAnimFrames[this.currentFrame], 0);
    }
    // Update the frame position.
    if (this.throwAnimationTime !== null) {
    this.throwAnimationTime += deltaTime;
    if (this.throwAnimationTime >= 3 * this.config.THROW_FRAME_DURATION) {
    this.throwAnimationTime = null;
    }
    }
    if (this.shieldAnimationTime !== null) {
    this.shieldAnimationTime += deltaTime;
    if (this.shieldAnimationTime >= 9 * 140) {
    this.shieldAnimationTime = null;
    }
    }
    if (this.timer >= this.msPerFrame) {
    this.currentFrame = (this.currentFrame +
    Math.floor(this.timer / this.msPerFrame)) % this.currentAnimFrames.length;
    this.timer %= this.msPerFrame;
    }
    },
    /**
    * Draw the t-rex to a particular position.
    * @param {number} x
    * @param {number} y
    */
    draw: function(x, y) {
    this.canvasCtx.save();
    this.canvasCtx.imageSmoothingEnabled = false;
    var characterImage = this.image;
    var shieldImage = Runner.instance_.images.SHIELD_ACTIVATION;
    // Keep the normal sprite if the shield animation is unavailable.
    // Drawing a broken image throws and stops the animation loop.
    if (this.shieldAnimationTime !== null && this.status !== Trex.status.CRASHED &&
    shieldImage && shieldImage.complete && shieldImage.naturalWidth >= 9 * 47 &&
    shieldImage.naturalHeight >= 47) {
    characterImage = shieldImage;
    x = Math.min(8, Math.floor(this.shieldAnimationTime / 140)) * 47;
    y = 0;
    }
    var throwImage = Runner.instance_.images.THROW;
    if (this.throwAnimationTime !== null && this.status !== Trex.status.CRASHED &&
    throwImage && throwImage.complete && throwImage.naturalWidth >= 3 * 47 &&
    throwImage.naturalHeight >= 47) {
    characterImage = throwImage;
    x = Math.min(2, Math.floor(this.throwAnimationTime /
    this.config.THROW_FRAME_DURATION)) * 47;
    y = 0;
    }
    this.canvasCtx.drawImage(characterImage, x, y, 47, 47,
    this.xPos, this.yPos,
    this.config.WIDTH, this.config.HEIGHT);
    this.canvasCtx.restore();
    },
    /**
    * Sets a random time for the blink to happen.
    */
    setBlinkDelay: function() {
    this.blinkDelay = Math.ceil(Math.random() * Trex.BLINK_TIMING);
    },
    /**
    * Make t-rex blink at random intervals.
    * @param {number} time Current time in milliseconds.
    */
    blink: function(time) {
    var deltaTime = time - this.animStartTime;
    if (deltaTime >= this.blinkDelay) {
    this.draw(this.currentAnimFrames[this.currentFrame], 0);
    if (this.currentFrame == 1) {
    // Set new random delay to blink.
    this.setBlinkDelay();
    this.animStartTime = time;
    }
    }
    },
    /**
    * Initialise a jump.
    */
    startJump: function() {
    if (!this.jumping) {
    this.update(0, Trex.status.JUMPING);
    this.jumpVelocity = this.config.INIITAL_JUMP_VELOCITY;
    this.jumping = true;
    this.reachedMinHeight = false;
    this.speedDrop = false;
    }
    },
    /**
    * Jump is complete, falling down.
    */
    endJump: function() {
    if (this.reachedMinHeight &&
    this.jumpVelocity < this.config.DROP_VELOCITY) {
    this.jumpVelocity = this.config.DROP_VELOCITY;
    }
    },
    /**
    * Update frame for a jump.
    * @param {number} deltaTime
    */
    updateJump: function(deltaTime) {
    var msPerFrame = Trex.animFrames[this.status].msPerFrame;
    var framesElapsed = deltaTime / msPerFrame;
    // Speed drop makes Trex fall faster.
    if (this.speedDrop) {
    this.yPos += Math.round(this.jumpVelocity *
    this.config.SPEED_DROP_COEFFICIENT * framesElapsed);
    } else {
    this.yPos += Math.round(this.jumpVelocity * framesElapsed);
    }
    this.jumpVelocity += this.config.GRAVITY * framesElapsed;
    // Minimum height has been reached.
    if (this.yPos < this.minJumpHeight || this.speedDrop) {
    this.reachedMinHeight = true;
    }
    // Reached max height
    if (this.yPos < this.config.MAX_JUMP_HEIGHT || this.speedDrop) {
    this.endJump();
    }
    // Back down at ground level. Jump completed.
    if (this.yPos > this.groundYPos) {
    this.reset();
    this.jumpCount++;
    }
    // Runner.update advances the sprite once, after drawing the background.
    },
    /**
    * Set the speed drop. Immediately cancels the current jump.
    */
    setSpeedDrop: function() {
    this.speedDrop = true;
    this.jumpVelocity = 1;
    },
    /**
    * Reset the t-rex to running at start of game.
    */
    reset: function() {
    this.yPos = this.groundYPos;
    this.jumpVelocity = 0;
    this.jumping = false;
    this.update(0, Trex.status.RUNNING);
    this.midair = false;
    this.speedDrop = false;
    this.jumpCount = 0;
    }
    };
    //******************************************************************************
    /**
    * Handles displaying the distance meter.
    * @param {!HTMLCanvasElement} canvas
    * @param {!HTMLImage} spriteSheet Image sprite.
    * @param {number} canvasWidth
    * @constructor
    */
    function DistanceMeter(canvas, spriteSheet, canvasWidth) {
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.image = spriteSheet;
    this.x = 0;
    this.y = 5;
    this.currentDistance = 0;
    this.maxScore = 0;
    this.highScore = 0;
    this.container = null;
    this.digits = [];
    this.acheivement = false;
    this.defaultString = '';
    this.flashTimer = 0;
    this.flashIterations = 0;
    this.config = DistanceMeter.config;
    this.init(canvasWidth);
    };
    /**
    * @enum {number}
    */
    DistanceMeter.dimensions = {
    WIDTH: 10,
    HEIGHT: 13,
    DEST_WIDTH: 11
    };
    /**
    * Y positioning of the digits in the sprite sheet.
    * X position is always 0.
    * @type {array.<number>}
    */
    DistanceMeter.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];
    /**
    * Distance meter config.
    * @enum {number}
    */
    DistanceMeter.config = {
    // Number of digits.
    MAX_DISTANCE_UNITS: 5,
    // Distance that causes achievement animation.
    ACHIEVEMENT_DISTANCE: 100,
    // Used for conversion from pixel distance to a scaled unit.
    COEFFICIENT: 0.025,
    // Flash duration in milliseconds.
    FLASH_DURATION: 1000 / 4,
    // Flash iterations for achievement animation.
    FLASH_ITERATIONS: 3
    };
    DistanceMeter.prototype = {
    /**
    * Initialise the distance meter to '00000'.
    * @param {number} width Canvas width in px.
    */
    init: function(width) {
    var maxDistanceStr = '';
    this.calcXPos(width);
    this.maxScore = this.config.MAX_DISTANCE_UNITS;
    for (var i = 0; i < this.config.MAX_DISTANCE_UNITS; i++) {
    this.draw(i, 0);
    this.defaultString += '0';
    maxDistanceStr += '9';
    }
    this.maxScore = parseInt(maxDistanceStr);
    },
    /**
    * Calculate the xPos in the canvas.
    * @param {number} canvasWidth
    */
    calcXPos: function(canvasWidth) {
    this.x = canvasWidth - (DistanceMeter.dimensions.DEST_WIDTH *
    (this.config.MAX_DISTANCE_UNITS + 1));
    },
    /**
    * Draw a digit to canvas.
    * @param {number} digitPos Position of the digit.
    * @param {number} value Digit value 0-9.
    * @param {boolean} opt_highScore Whether drawing the high score.
    */
    draw: function() {
    // Score and record are rendered by Runner.drawCloneHealth in the HUD.
    },
    /**
    * Covert pixel distance to a 'real' distance.
    * @param {number} distance Pixel distance ran.
    * @return {number} The 'real' distance ran.
    */
    getActualDistance: function(distance) {
    return distance ?
    Math.round(distance * this.config.COEFFICIENT) : 0;
    },
    /**
    * Update the distance meter.
    * @param {number} deltaTime
    * @param {number} distance
    * @return {boolean} Whether the acheivement sound fx should be played.
    */
    update: function(deltaTime, distance) {
    if (Runner.instance_.gameMode !== 'infinite') return false;
    var paint = true;
    var playSound = false;
    if (!this.acheivement) {
    distance = this.getActualDistance(distance);
    if (distance > 0) {
    // Acheivement unlocked
    if (distance % this.config.ACHIEVEMENT_DISTANCE == 0) {
    // Flash score and play sound.
    this.acheivement = true;
    this.flashTimer = 0;
    playSound = true;
    }
    // Create a string representation of the distance with leading 0.
    var distanceStr = (this.defaultString +
    distance).substr(-this.config.MAX_DISTANCE_UNITS);
    this.digits = distanceStr.split('');
    } else {
    this.digits = this.defaultString.split('');
    }
    } else {
    // Control flashing of the score on reaching acheivement.
    if (this.flashIterations <= this.config.FLASH_ITERATIONS) {
    this.flashTimer += deltaTime;
    if (this.flashTimer < this.config.FLASH_DURATION) {
    paint = false;
    } else if (this.flashTimer >
    this.config.FLASH_DURATION * 2) {
    this.flashTimer = 0;
    this.flashIterations++;
    }
    } else {
    this.acheivement = false;
    this.flashIterations = 0;
    this.flashTimer = 0;
    }
    }
    // Draw the digits if not flashing.
    if (paint) {
    for (var i = this.digits.length - 1; i >= 0; i--) {
    this.draw(i, parseInt(this.digits[i]));
    }
    }
    this.drawHighScore();
    return playSound;
    },
    /**
    * Draw the high score.
    */
    drawHighScore: function() {
    this.canvasCtx.save();
    this.canvasCtx.globalAlpha = .8;
    for (var i = this.highScore.length - 1; i >= 0; i--) {
    this.draw(i, parseInt(this.highScore[i], 10), true);
    }
    this.canvasCtx.restore();
    },
    /**
    * Set the highscore as a array string.
    * Position of char in the sprite: H - 10, I - 11.
    * @param {number} distance Distance ran in pixels.
    */
    setHighScore: function(distance) {
    distance = this.getActualDistance(distance);
    var highScoreStr = (this.defaultString +
    distance).substr(-this.config.MAX_DISTANCE_UNITS);
    this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
    },
    /**
    * Reset the distance meter back to '00000'.
    */
    reset: function() {
    this.update(0);
    this.acheivement = false;
    }
    };
    //******************************************************************************
    /**
    * Cloud background item.
    * Similar to an obstacle object but without collision boxes.
    * @param {HTMLCanvasElement} canvas Canvas element.
    * @param {Image} cloudImg
    * @param {number} containerWidth
    */
    function Cloud(canvas, cloudImg, containerWidth) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.image = cloudImg;
    this.containerWidth = containerWidth;
    this.xPos = containerWidth;
    this.yPos = 0;
    this.remove = false;
    this.cloudGap = getRandomNum(Cloud.config.MIN_CLOUD_GAP,
    Cloud.config.MAX_CLOUD_GAP);
    this.init();
    };
    /**
    * Cloud object config.
    * @enum {number}
    */
    Cloud.config = {
    HEIGHT: 14,
    MAX_CLOUD_GAP: 400,
    MAX_SKY_LEVEL: 30,
    MIN_CLOUD_GAP: 100,
    MIN_SKY_LEVEL: 71,
    WIDTH: 46
    };
    Cloud.prototype = {
    /**
    * Initialise the cloud. Sets the Cloud height.
    */
    init: function() {
    this.yPos = getRandomNum(Cloud.config.MAX_SKY_LEVEL,
    Cloud.config.MIN_SKY_LEVEL);
    this.draw();
    },
    /**
    * Draw the cloud.
    */
    draw: function() {
    this.canvasCtx.save();
    var sourceWidth = Cloud.config.WIDTH;
    var sourceHeight = Cloud.config.HEIGHT;
    if (IS_HIDPI) {
    sourceWidth = sourceWidth * 2;
    sourceHeight = sourceHeight * 2;
    }
    this.canvasCtx.drawImage(this.image, 0, 0,
    sourceWidth, sourceHeight,
    this.xPos, this.yPos,
    Cloud.config.WIDTH, Cloud.config.HEIGHT);
    this.canvasCtx.restore();
    },
    /**
    * Update the cloud position.
    * @param {number} speed
    */
    update: function(speed) {
    if (!this.remove) {
    this.xPos -= Math.ceil(speed);
    this.draw();
    // Mark as removeable if no longer in the canvas.
    if (!this.isVisible()) {
    this.remove = true;
    }
    }
    },
    /**
    * Check if the cloud is visible on the stage.
    * @return {boolean}
    */
    isVisible: function() {
    return this.xPos + Cloud.config.WIDTH > 0;
    }
    };
    //******************************************************************************
    /**
    * Horizon Line.
    * Consists of two connecting lines. Randomly assigns a flat / bumpy horizon.
    * @param {HTMLCanvasElement} canvas
    * @param {HTMLImage} bgImg Horizon line sprite.
    * @constructor
    */
    function HorizonLine(canvas, bgImg, pictureImg) {
    this.image = bgImg;
    this.oneShotImage = document.getElementById('corridor-one-shot');
    this.pictureImage = pictureImg;
    this.canvas = canvas;
    this.canvasCtx = canvas.getContext('2d');
    this.sourceDimensions = {};
    this.dimensions = HorizonLine.dimensions;
    this.sourceXPos = [0, this.dimensions.WIDTH];
    this.xPos = [];
    this.yPos = 0;
    this.bumpThreshold = 0.5;
    this.setSourceDimensions();
    this.draw();
    };
    /**
    * Horizon line dimensions.
    * @enum {number}
    */
    HorizonLine.dimensions = {
    WIDTH: 600,
    HEIGHT: 12,
    YPOS: 127
    };
    HorizonLine.prototype = {
    /**
    * Set the source dimensions of the horizon line.
    */
    setSourceDimensions: function() {
    for (var dimension in HorizonLine.dimensions) {
    if (IS_HIDPI) {
    if (dimension != 'YPOS') {
    this.sourceDimensions[dimension] =
    HorizonLine.dimensions[dimension] * 2;
    }
    } else {
    this.sourceDimensions[dimension] =
    HorizonLine.dimensions[dimension];
    }
    this.dimensions[dimension] = HorizonLine.dimensions[dimension];
    }
    this.xPos = [0, HorizonLine.dimensions.WIDTH];
    this.yPos = HorizonLine.dimensions.YPOS;
    },
    /**
    * Return the crop x position of a type.
    */
    getRandomType: function() {
    return Math.random() > this.bumpThreshold ? this.dimensions.WIDTH : 0;
    },
    /**
    * Draw the horizon line.
    */
    draw: function() {
    if (this.image.id === 'corridor-scenery') {
    this.drawCorridor();
    return;
    }
    if (this.image.id === 'custom-ground') {
    this.drawCustomGround(this.xPos[0]);
    this.drawCustomGround(this.xPos[1]);
    var customNextX = Math.max(this.xPos[0], this.xPos[1]) +
    this.dimensions.WIDTH;
    while (customNextX < this.canvas.width) {
    this.drawCustomGround(customNextX);
    customNextX += this.dimensions.WIDTH;
    }
    return;
    }
    this.canvasCtx.drawImage(this.image, this.sourceXPos[0], 0,
    this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
    this.xPos[0], this.yPos,
    this.dimensions.WIDTH, this.dimensions.HEIGHT);
    this.canvasCtx.drawImage(this.image, this.sourceXPos[1], 0,
    this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
    this.xPos[1], this.yPos,
    this.dimensions.WIDTH, this.dimensions.HEIGHT);

    // Wide screens can show more than the two original 600px pieces.
    // Keep drawing connected pieces until the full canvas is covered.
    var nextX = Math.max(this.xPos[0], this.xPos[1]) +
    this.dimensions.WIDTH;
    while (nextX < this.canvas.width) {
    this.canvasCtx.drawImage(this.image, this.sourceXPos[1], 0,
    this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
    nextX, this.yPos,
    this.dimensions.WIDTH + 1, this.dimensions.HEIGHT);
    nextX += this.dimensions.WIDTH;
    }
    },
    /** A continuous corridor with individually spaced hospital details. */
    drawCorridor: function(criticalOverride) {
    var ctx = this.canvasCtx;
    var runner = Runner.instance_;
    if (criticalOverride === undefined && runner && runner.escapeActive && runner.escapeLongWalk) {
    var restore = runner.escapeRestore;
    if (restore < 1) this.drawCorridor(true);
    if (restore === 1) this.drawCorridor(false);
    else if (restore > 0) {
    // Blend complete scenes once, so individual details and grading cannot
    // override the transition opacity or abruptly brighten the corridor.
    if (!this.restoreCanvas) {
    this.restoreCanvas = document.createElement('canvas');
    this.restoreCanvas.width = Runner.defaultDimensions.WIDTH;
    this.restoreCanvas.height = Runner.defaultDimensions.HEIGHT;
    }
    var restoreCtx = this.restoreCanvas.getContext('2d');
    restoreCtx.clearRect(0, 0, this.restoreCanvas.width, this.restoreCanvas.height);
    this.canvasCtx = restoreCtx;
    try {
    this.drawCorridor(false);
    } finally {
    this.canvasCtx = ctx;
    }
    ctx.save();
    ctx.globalAlpha = restore;
    ctx.drawImage(this.restoreCanvas, 0, 0);
    ctx.restore();
    }
    return;
    }
    var width = Runner.defaultDimensions.WIDTH;
    var travel = this.corridorTravel || 0;
    var critical = Runner.instance_ && (Runner.instance_.cloneHealth === 1 || Runner.instance_.escapeActive) &&
    this.oneShotImage && this.oneShotImage.complete && this.oneShotImage.naturalWidth > 0;
    if (criticalOverride !== undefined) critical = criticalOverride && this.oneShotImage && this.oneShotImage.complete && this.oneShotImage.naturalWidth > 0;
    if (!this.corridorSections) {
    this.corridorSections = [];
    this.corridorEnd = 0;
    this.corridorIndex = 0;
    }
    while (this.corridorEnd < travel + width + 360) {
    var index = this.corridorIndex++;
    var seed = Math.abs(Math.sin(index * 127.1 + 311.7) * 43758.5453) % 1;
    var variant = (index + Math.floor(seed * 4)) % 5;
    var previous = this.corridorSections[this.corridorSections.length - 1];
    if (previous && previous.variant === variant) variant = (variant + 1) % 5;
    var length = 340 + Math.floor(seed * 180);
    this.corridorSections.push({x: this.corridorEnd, width: length,
    variant: variant, seed: seed,
    picture: Math.random() < 0.65,
    pictureX: 210 + Math.random() * (length - 260),
    pictureY: 53 + Math.random() * 15});
    this.corridorEnd += length;
    }
    this.corridorSections = this.corridorSections.filter(function(section) {
    return section.x + section.width > travel - 40;
    });
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = critical ? '#240607' : '#ffffff';
    ctx.fillRect(0, 0, width, this.yPos);
    if (critical) {
    ctx.fillStyle = '#180000';
    ctx.fillRect(0, this.yPos - 46, width, 46);
    }
    ctx.fillStyle = '#c4d5da';
    ctx.fillRect(0, this.yPos, width, 23);
    ctx.fillStyle = critical ? '#180000' : '#799da8';
    ctx.fillRect(0, this.yPos - 4, width, 4);
    ctx.fillStyle = '#a6bec6';
    ctx.fillRect(0, this.yPos + 12, width, 1);
    if (critical) {
    // Repeat only the painted floor, excluding the empty parts of the sheet.
    for (var floorX = -(travel % 96); floorX < width; floorX += 96) {
    ctx.drawImage(this.oneShotImage, 324, 813, 256, 65,
    floorX, this.yPos, 96, 23);
    }
    }
    var scenery = critical ? this.oneShotImage : this.image;
    // Keep doors near the player's height, with all decor on the same scale.
    var sceneryScale = 0.75;
    var baseline = this.yPos;
    function overlapsExit(x, itemWidth) {
    return runner && runner.escapeActive &&
    x < runner.escapeDoorX + 76 && x + itemWidth > runner.escapeDoorX - 34;
    }
    function detail(sx, sy, sw, sh, x, bottom, scale) {
    scale *= sceneryScale;
    if (overlapsExit(x, Math.round(sw * scale))) return;
    bottom = baseline - (baseline - bottom) * sceneryScale;
    ctx.drawImage(scenery, sx, sy, sw, sh,
    x, Math.round(bottom - sh * scale),
    Math.round(sw * scale), Math.round(sh * scale));
    }
    for (var i = 0; i < this.corridorSections.length; i++) {
    var section = this.corridorSections[i];
    var x = section.x - travel;
    if (!critical && section.picture && this.pictureImage && !overlapsExit(x + section.pictureX, 34)) {
    // Crop the empty upper part; keep the frame and hanging cord together.
    ctx.drawImage(this.pictureImage, 0, 105, 100, 90,
    x + section.pictureX, section.pictureY, 34, 30.6);
    }
    var doorX = x + 28 + Math.floor(section.seed * 30);
    detail(332, 427, 32, 86, doorX, this.yPos, 0.9);
    if (section.variant === 0) {
    detail(389, 466, 121, 47, x + 115, this.yPos, 0.85);
    } else if (section.variant === 1) {
    detail(689, 479, 119, 34, x + 125, this.yPos, 0.85);
    detail(680, 427, 16, 29, doorX + 48, 83, 0.8);
    } else if (section.variant === 2) {
    if (critical) {
    detail(431, 695, 33, 33, doorX - 10, 43, 0.8);
    } else {
    detail(479, 667, 63, 22, doorX - 10, 43, 0.8);
    detail(479, 726, 32, 39, x + 140, 88, 0.7);
    }
    } else if (section.variant === 3) {
    detail(68, 754, 21, 59, x + 145, this.yPos, 0.85);
    detail(76, 672, 40, 18, x + 120, 39, 0.8);
    } else {
    detail(389, 792, 112, 21, x + 130, this.yPos, 0.9);
    }
    }
    // Soften fine, high-contrast details without affecting gameplay sprites.
    if (critical) {
    // Grade only scenery; characters, pickups and obstacles remain readable.
    ctx.fillStyle = 'rgba(12, 0, 3, 0.64)';
    ctx.fillRect(0, 0, width, 150);
    ctx.fillStyle = 'rgba(65, 0, 6, 0.6)';
    ctx.fillRect(0, this.yPos, width, 23);
    for (var lampX = 110 - (travel % 240); lampX < width + 90; lampX += 240) {
    if (overlapsExit(lampX - 14, 28)) continue;
    var glow = ctx.createRadialGradient(lampX, 18, 2, lampX, 18, 115);
    glow.addColorStop(0, 'rgba(255, 35, 15, 0.35)');
    glow.addColorStop(0.45, 'rgba(180, 8, 8, 0.14)');
    glow.addColorStop(1, 'rgba(90, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(lampX - 115, 0, 230, 150);
    ctx.fillStyle = '#36080a';
    ctx.fillRect(lampX - 14, 8, 28, 8);
    ctx.fillStyle = '#ff4935';
    ctx.fillRect(lampX - 10, 11, 20, 3);
    }
    var shadow = ctx.createLinearGradient(0, 0, 0, 150);
    shadow.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    shadow.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
    shadow.addColorStop(0.8, 'rgba(0, 0, 0, 0)');
    shadow.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, width, 150);
    } else {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#e8ede9';
    ctx.fillRect(0, 0, width, this.yPos);
    }
    ctx.restore();
    },
    /** Draw only the painted bottom strip from the custom 600px sprite. */
    drawCustomGround: function(x) {
    this.canvasCtx.drawImage(this.image, 0, 500, 600, 100,
    x, this.yPos, this.dimensions.WIDTH + 1, 23);
    },
    /**
    * Update the x position of an indivdual piece of the line.
    * @param {number} pos Line position.
    * @param {number} increment
    */
    updateXPos: function(pos, increment) {
    var line1 = pos;
    var line2 = pos == 0 ? 1 : 0;
    this.xPos[line1] -= increment;
    this.xPos[line2] = this.xPos[line1] + this.dimensions.WIDTH;
    if (this.xPos[line1] <= -this.dimensions.WIDTH) {
    this.xPos[line1] += this.dimensions.WIDTH * 2;
    this.xPos[line2] = this.xPos[line1] - this.dimensions.WIDTH;
    this.sourceXPos[line1] = this.getRandomType();
    }
    },
    /**
    * Update the horizon line.
    * @param {number} deltaTime
    * @param {number} speed
    */
    update: function(deltaTime, speed) {
    var increment = speed * (FPS / 1000) * deltaTime;
    if (this.image.id === 'corridor-scenery') {
    // The corridor and obstacles belong to the same moving world.
    this.corridorTravel = (this.corridorTravel || 0) + increment;
    this.draw();
    return;
    }
    if (this.xPos[0] <= 0) {
    this.updateXPos(0, increment);
    } else {
    this.updateXPos(1, increment);
    }
    this.draw();
    },
    /**
    * Reset horizon to the starting position.
    */
    reset: function() {
    this.xPos[0] = 0;
    this.xPos[1] = HorizonLine.dimensions.WIDTH;
    this.corridorTravel = 0;
    this.corridorSections = null;
    }
    };
    //******************************************************************************
    /**
    * Horizon background class.
    * @param {HTMLCanvasElement} canvas
    * @param {Array.<HTMLImageElement>} images
    * @param {object} dimensions Canvas dimensions.
    * @param {number} gapCoefficient
    * @constructor
    */
    function Horizon(canvas, images, dimensions, gapCoefficient) {
    this.canvas = canvas;
    this.canvasCtx = this.canvas.getContext('2d');
    this.config = Horizon.config;
    this.dimensions = dimensions;
    this.gapCoefficient = gapCoefficient;
    this.obstacles = [];
    this.horizonOffsets = [0, 0];
    this.cloudFrequency = this.config.CLOUD_FREQUENCY;
    // Cloud
    this.clouds = [];
    this.cloudImg = images.CLOUD;
    this.cloudSpeed = this.config.BG_CLOUD_SPEED;
    // Horizon
    this.horizonImg = images.GROUND || images.HORIZON;
    this.pictureImg = images.WALL_PICTURE;
    this.horizonLine = null;
    // Obstacles
    this.obstacleImgs = {
    VIRUS: images.VIRUS,
    WHEELCHAIR: images.WHEELCHAIR,
    IV_STAND: images.IV_STAND
    };
    this.init();
    };
    /**
    * Horizon config.
    * @enum {number}
    */
    Horizon.config = {
    BG_CLOUD_SPEED: 0.2,
    BUMPY_THRESHOLD: .3,
    CLOUD_FREQUENCY: .5,
    HORIZON_HEIGHT: 16,
    MAX_CLOUDS: 6
    };
    Horizon.prototype = {
    /**
    * Initialise the horizon line. No obstacles.
    */
    init: function() {
    this.horizonLine = new HorizonLine(this.canvas, this.horizonImg,
    this.pictureImg);
    },
    /**
    * @param {number} deltaTime
    * @param {number} currentSpeed
    * @param {boolean} updateObstacles Used as an override to prevent
    * the obstacles from being updated / added. This happens in the
    * ease in section.
    */
    update: function(deltaTime, currentSpeed, updateObstacles) {
    this.obstacleMovement = updateObstacles ?
    currentSpeed * FPS / 1000 * deltaTime : 0;
    this.runningTime += deltaTime;
    this.horizonLine.update(deltaTime, currentSpeed);
    if (updateObstacles) {
    this.updateObstacles(deltaTime, currentSpeed);
    }
    },
    /**
    * Update the cloud positions.
    * @param {number} deltaTime
    * @param {number} currentSpeed
    */
    updateClouds: function(deltaTime, speed) {
    var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
    var numClouds = this.clouds.length;
    if (numClouds) {
    for (var i = numClouds - 1; i >= 0; i--) {
    this.clouds[i].update(cloudSpeed);
    }
    var lastCloud = this.clouds[numClouds - 1];
    // Check for adding a new cloud.
    if (numClouds < this.config.MAX_CLOUDS &&
    (this.dimensions.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
    this.cloudFrequency > Math.random()) {
    this.addCloud();
    }
    // Remove expired clouds.
    this.clouds = this.clouds.filter(function(obj) {
    return !obj.remove;
    });
    }
    },
    /**
    * Update the obstacle positions.
    * @param {number} deltaTime
    * @param {number} currentSpeed
    */
    updateObstacles: function(deltaTime, currentSpeed) {
    // Obstacles, move to Horizon layer.
    var updatedObstacles = this.obstacles.slice(0);
    for (var i = 0; i < this.obstacles.length; i++) {
    var obstacle = this.obstacles[i];
    obstacle.update(deltaTime, currentSpeed);
    // Clean up existing obstacles.
    if (obstacle.remove) {
    updatedObstacles.shift();
    }
    }
    this.obstacles = updatedObstacles;
    if (this.obstacles.length > 0) {
    var lastObstacle = this.obstacles[this.obstacles.length - 1];
    if (lastObstacle && !lastObstacle.followingObstacleCreated &&
    lastObstacle.isVisible() &&
    (lastObstacle.xPos + lastObstacle.width + lastObstacle.gap) <
    this.dimensions.WIDTH) {
    lastObstacle.followingObstacleCreated = this.addNewObstacle(currentSpeed);
    }
    } else {
    // Create new obstacles.
    this.addNewObstacle(currentSpeed);
    }
    },
    /**
    * Add a new obstacle.
    * @param {number} currentSpeed
    */
    addNewObstacle: function(currentSpeed) {
    var pickup = this.reservedPowerUp;
    if (pickup && pickup.x + Runner.config.POWER_UP_SIZE * 1.5 +
    Runner.config.POWER_UP_OBSTACLE_CLEARANCE > this.dimensions.WIDTH) {
    return false;
    }
    var previousObstacle = this.obstacles[this.obstacles.length - 1];
    var availableTypes = Obstacle.types.filter(function(type) {
    return !previousObstacle || type.type !== previousObstacle.typeConfig.type;
    });
    var obstacleTypeIndex = getRandomNum(0, availableTypes.length - 1);
    var obstacleType = availableTypes[obstacleTypeIndex];
    var obstacleImg = this.obstacleImgs[obstacleType.type];
    this.obstacles.push(new Obstacle(this.canvasCtx, obstacleType,
    obstacleImg, this.dimensions, this.gapCoefficient, currentSpeed));
    return true;
    },
    /**
    * Reset the horizon layer.
    * Remove existing obstacles and reposition the horizon line.
    */
    reset: function() {
    this.obstacles = [];
    this.horizonLine.reset();
    this.reservedPowerUp = null;
    this.obstacleMovement = 0;
    },
    /**
    * Update the canvas width and scaling.
    * @param {number} width Canvas width.
    * @param {number} height Canvas height.
    */
    resize: function(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    },
    /**
    * Add a new cloud to the horizon.
    */
    addCloud: function() {
    this.clouds.push(new Cloud(this.canvas, this.cloudImg,
    this.dimensions.WIDTH));
    }
    };
    })();
function fitGameToWindow() {
  var game = document.getElementById('main-frame-error');
  var hud = document.getElementById('game-hud');
  var controls = document.getElementById('mobile-controls');
  var sceneHeight = Runner.defaultDimensions.HEIGHT;
  var touchLayout = window.matchMedia('(any-pointer: coarse)').matches;
  if (touchLayout) hud.style.top = '';
  var viewport = window.visualViewport;
  var width = viewport ? viewport.width : window.innerWidth;
  var height = viewport ? viewport.height : window.innerHeight;
  // Read the actual safe-area spacing and responsive control sizes from CSS.
  var hudStyle = window.getComputedStyle(hud);
  var controlsStyle = window.getComputedStyle(controls);
  var topInset = touchLayout ? (parseFloat(hudStyle.top) || 12) +
    (parseFloat(hudStyle.height) || 88) + 8 : 0;
  var bottomInset = touchLayout ? (parseFloat(controlsStyle.bottom) || 12) +
    (parseFloat(controlsStyle.height) || 88) + 12 : 0;
  var left = touchLayout ? (parseFloat(controlsStyle.left) || 12) : 0;
  var right = touchLayout ? (parseFloat(controlsStyle.right) || 12) : 0;
  var availableWidth = Math.max(1, width - left - right);
  var availableHeight = Math.max(1, height - topInset - bottomInset);
  var scale = Math.min(availableHeight / sceneHeight, 2.5,
    touchLayout ? availableWidth / (width < height ? 480 : 600) : Infinity);
  var top = topInset + (availableHeight - sceneHeight * scale) / 2;

  game.style.width = (availableWidth / scale) + 'px';
  game.style.left = left + 'px';
  game.style.top = top + 'px';
  hud.style.top = touchLayout ? '' : (top + 6) + 'px';
  game.style.transform = 'scale(' + scale + ')';
  Runner.displayScale = scale;

  if (Runner.instance_) {
    Runner.instance_.adjustDimensions();
  }
}

fitGameToWindow();
window.addEventListener('resize', fitGameToWindow);
if (window.visualViewport) window.visualViewport.addEventListener('resize', function() {
  resetMobileControls();
  fitGameToWindow();
});
var runner = new Runner('.interstitial-wrapper');
var startScreen = document.getElementById('start-screen');
var gameOverScreen = document.getElementById('game-over-screen');
var restartButton = document.getElementById('restart-button');
var menuButton = document.getElementById('menu-button');
var modeButtons = document.querySelectorAll('[data-game-mode]');
var devDialog = document.getElementById('dev-dialog');
var devPassword = document.getElementById('dev-password');
var devError = document.getElementById('dev-error');
var mobileControls = document.getElementById('mobile-controls');
var mobilePointers = new Map();

function resetMobileControls() {
  if (!mobilePointers) return;
  mobilePointers.forEach(function(button) { button.classList.remove('is-pressed'); });
  mobilePointers.clear();
  if (runner) {
    runner.sprintKeyHeld = false;
    runner.speedBoostActive = false;
    if (runner.tRex) runner.tRex.endJump();
  }
}

function mobileAction(action, pressed) {
  if (runner.deathRemaining > 0) return;
  if (runner.jumpscareRemaining > 0) return;
  if (runner.escapeActive && (runner.escapeEntering !== null || action === 'throw')) return;
  if (pressed && runner.paused && !runner.crashed && !isStartMenuOpen()) runner.play();
  if (pressed) resumeGameAudio();
  if (action === 'run') {
    runner.sprintKeyHeld = pressed;
    if (!pressed) {
      runner.speedBoostActive = false;
      runner.sprintExhausted = false;
    }
  } else if (action === 'jump') {
    if (pressed && !runner.tRex.jumping) {
      runner.playSound(runner.soundFx.BUTTON_PRESS);
      runner.tRex.startJump();
    } else if (!pressed) runner.tRex.endJump();
  } else if (action === 'throw' && pressed) runner.throwPowerUp();
}

mobileControls.querySelectorAll('[data-control]').forEach(function(button) {
  button.addEventListener('pointerdown', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if ((!runner.escapeActive && (runner.crashed || (!runner.activated && !runner.paused))) || mobileControls.hidden || isStartMenuOpen()) return;
    if (Array.from(mobilePointers.values()).includes(button)) return;
    button.setPointerCapture(e.pointerId);
    mobilePointers.set(e.pointerId, button);
    button.classList.add('is-pressed');
    mobileAction(button.dataset.control, true);
  });
  function release(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!mobilePointers.has(e.pointerId)) return;
    mobilePointers.delete(e.pointerId);
    button.classList.remove('is-pressed');
    mobileAction(button.dataset.control, false);
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(type) {
    button.addEventListener(type, release);
  });
  ['mousedown', 'mouseup', 'touchstart', 'touchend', 'contextmenu'].forEach(function(type) {
    button.addEventListener(type, function(e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
  });
  button.addEventListener('click', function(e) {
    e.stopPropagation();
    if (e.detail === 0 && (runner.activated || runner.paused) && !runner.crashed && !mobileControls.hidden && !isStartMenuOpen()) {
      mobileAction(button.dataset.control, true);
      mobileAction(button.dataset.control, false);
    }
  });
});
window.addEventListener('blur', resetMobileControls);
window.addEventListener('resize', resetMobileControls);
document.addEventListener('visibilitychange', resetMobileControls);

function showGameOverScreen(won, score) {
  document.body.classList.remove('escape-scene');
  document.body.classList.remove('critical-scene');
  document.getElementById('game-hud').hidden = true;
  mobileControls.hidden = true;
  gameOverScreen.classList.toggle('is-victory', won);
  document.getElementById('result-label').textContent = won ? 'VITÓRIA' : 'DERROTA';
  document.getElementById('game-over-title').textContent =
    won ? 'VOCÊ ENCONTROU A SAÍDA.' : 'O VIROCRATA-19 TE PEGOU!';
  document.getElementById('result-message').textContent = won ?
    'O corredor ficou para trás. Pela primeira vez, você pode respirar.' :
    'Use as vacinas e a corrida para escapar na próxima tentativa.';
  document.getElementById('result-score').textContent = 'PONTUAÇÃO: ' + score;
  document.getElementById('result-score').hidden = runner.gameMode !== 'infinite';
  restartButton.textContent = '↻ TENTAR NOVAMENTE';
  gameOverScreen.classList.remove('is-hidden');
  restartButton.focus({ preventScroll: true });
}

function hideGameOverScreen() {
  document.getElementById('mobile-run').textContent = '→ CORRER';
  document.body.classList.remove('escape-scene');
  gameOverScreen.classList.add('is-hidden');
  mobileControls.hidden = false;
}

function startFromMenu(mode) {
  runner.stop();
  runner.gameMode = mode;
  startScreen.classList.add('is-hidden');
  mobileControls.hidden = false;
  if (!runner.audioContext) {
    runner.loadSounds();
  }
  resumeGameAudio();
  runner.activated = true;
  runner.paused = false;
  runner.time = 0;
  if (!runner.tRex.jumping) {
    runner.playSound(runner.soundFx.BUTTON_PRESS);
    runner.tRex.startJump();
  }
  if (!runner.raqId) {
    runner.update();
  }
}

function isStartMenuOpen() {
  // INTRODUÇÃO DO MODO NORMAL: mantém a partida parada durante a narrativa.
  if (window.normalIntro && window.normalIntro.active) return true;
  var menu = document.getElementById('start-screen');
  return menu && !menu.classList.contains('is-hidden');
}

function resumeGameAudio() {
  if (runner.audioContext && runner.audioContext.state === 'suspended') {
    runner.audioContext.resume().catch(function() {});
  }
}

document.getElementById('dev-form').addEventListener('submit', function(e) {
  e.preventDefault();
  if (devPassword.value !== 'Ronald<>Tuffano007!') {
    devError.textContent = 'Senha incorreta. Tente novamente.';
    devPassword.value = '';
    devPassword.focus();
    return;
  }
  devDialog.close();
  startFromMenu('dev');
});

document.getElementById('dev-cancel').addEventListener('click', function() {
  devDialog.close();
});

devDialog.addEventListener('close', function() {
  devPassword.value = '';
  devError.textContent = '';
});

for (var modeButtonIndex = 0; modeButtonIndex < modeButtons.length;
  modeButtonIndex++) {
  modeButtons[modeButtonIndex].addEventListener('click', function(e) {
    e.stopPropagation();
    // Unlock audio during the user's gesture, before the narrative transition.
    if (!runner.audioContext) runner.loadSounds();
    resumeGameAudio();
    if (this.getAttribute('data-game-mode') === 'dev') {
      devDialog.showModal();
      devPassword.focus();
      return;
    }
    // INTRODUÇÃO DO MODO NORMAL: reutiliza startFromMenu após a história.
    if (this.getAttribute('data-game-mode') === 'normal') {
      window.normalIntro.open();
      return;
    }
    startFromMenu(this.getAttribute('data-game-mode'));
  });
}

restartButton.addEventListener('click', function(e) {
  e.stopPropagation();
  runner.restart();
});

menuButton.addEventListener('click', function(e) {
  e.stopPropagation();
  returnToMenu();
});

function returnToMenu() {
  runner.gameMode = 'normal';
  runner.restart();
  runner.stop();
  hideGameOverScreen();
  startScreen.classList.remove('is-hidden');
  document.getElementById('game-hud').hidden = true;
  mobileControls.hidden = true;
}
