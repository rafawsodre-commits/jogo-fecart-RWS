const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('corridor and obstacles travel together at normal and sprint speeds', () => {
  const game = loadGame();
  game.startFromMenu('infinite');
  const horizon = game.runner.horizon;
  horizon.addNewObstacle(4.5);
  const obstacle = horizon.obstacles[0];
  obstacle.xPos = 1000;
  for (const [speed, duration] of [[4.5, 16], [12, 1000 / 144], [17, 75]]) {
    const previousX = obstacle.xPos;
    const previousTravel = horizon.horizonLine.corridorTravel || 0;
    horizon.update(duration, speed, true);
    const groundTravel = horizon.horizonLine.corridorTravel - previousTravel;
    assert.ok(Math.abs(groundTravel - (previousX - obstacle.xPos)) < 0.000001);
    assert.ok(Math.abs(groundTravel - horizon.obstacleMovement) < 0.000001);
  }
  horizon.reset();
  assert.equal(horizon.horizonLine.corridorTravel, 0);
});

test('Infinite keeps accelerating beyond both caps while Normal and Dev retain limits', () => {
  for (const mode of ['infinite', 'normal', 'dev']) {
    const game = loadGame();
    game.startFromMenu(mode);
    const runner = game.runner;
    runner.started = true;
    runner.tRex.reset();
    runner.currentSpeed = runner.config.MAX_SPEED;
    game.advance(16);
    if (mode === 'infinite') assert.ok(runner.currentSpeed > runner.config.MAX_SPEED);
    else assert.equal(runner.currentSpeed, runner.config.MAX_SPEED);
    runner.currentSpeed = runner.config.SPRINT_MAX_SPEED;
    runner.sprintKeyHeld = true;
    runner.updateStamina(100);
    if (mode === 'infinite') assert.ok(runner.currentSpeed > runner.config.SPRINT_MAX_SPEED);
    else assert.equal(runner.currentSpeed, runner.config.SPRINT_MAX_SPEED);
    const sprintSpeed = runner.currentSpeed;
    runner.sprintKeyHeld = false;
    runner.updateStamina(1000);
    if (mode === 'infinite') assert.equal(runner.currentSpeed, sprintSpeed);
    else assert.equal(runner.currentSpeed, runner.config.MAX_SPEED);
  }
});

test('canvas resolution includes CSS enlargement and fractional screen density', () => {
  const game = loadGame();
  const canvas = game.runner.canvas;
  for (const [density, enlargement] of [[1, 2.5], [1.25, 2.5], [1, 1]]) {
    game.window.devicePixelRatio = density;
    game.Runner.displayScale = enlargement;
    game.Runner.updateCanvasScaling(canvas, 600, 150);
    assert.equal(canvas.width, Math.ceil(600 * density * enlargement));
    assert.equal(canvas.height, Math.ceil(150 * density * enlargement));
    assert.equal(canvas.style.width, '600px');
    assert.equal(canvas.style.height, '150px');
  }
});

test('obstacle movement preserves distance across refresh rates and frame timing', () => {
  for (const durations of [Array(60).fill(1000 / 60), Array(144).fill(1000 / 144), Array(50).fill([12, 8]).flat()]) {
    const game = loadGame();
    game.startFromMenu('infinite');
    const horizon = game.runner.horizon;
    horizon.addNewObstacle(4.5);
    const obstacle = horizon.obstacles[0];
    obstacle.xPos = 1000;
    for (const duration of durations) obstacle.update(duration, 4.5);
    assert.ok(Math.abs(obstacle.xPos - 730) < 0.000001,
      `Expected 270 pixels of movement; got ${1000 - obstacle.xPos}`);
  }
});

test('HUD stays hidden after defeat or victory and returns on restart', () => {
  for (const won of [false, true]) {
    const game = loadGame();
    game.startFromMenu('normal');
    const hud = game.document.getElementById('game-hud');
    assert.equal(hud.hidden, false);
    game.runner.gameOver(won);
    assert.equal(hud.hidden, true);
    game.runner.drawStaminaBar();
    game.fitGameToWindow();
    assert.equal(hud.hidden, true);
    game.runner.restart();
    assert.equal(hud.hidden, false);
  }
});

test('the third pickup plays the special and grants a shield in every mode', () => {
  for (const mode of ['normal', 'infinite', 'dev']) {
    const game = loadGame();
    game.startFromMenu(mode);
    const runner = game.runner;
    runner.started = true;
    runner.testShieldPending = false;
    runner.tRex.reset();
    let drawnImage;
    runner.canvasCtx.drawImage = image => { drawnImage = image; };
    function collect() {
      runner.powerUp = { x: runner.tRex.xPos, y: runner.tRex.yPos, type: 'blue' };
      runner.updatePowerUp(0);
    }
    for (let count = 1; count <= 2; count++) {
      collect();
      assert.equal(runner.blueVaccinesCollected, count);
      assert.equal(runner.hasVirusShield, false);
      runner.companionDrawX = runner.tRex.xPos - 60;
      runner.throwPowerUp();
      runner.updatePowerUp(16);
      assert.equal(runner.tRex.shieldAnimationTime, null);
      assert.equal(runner.hasVirusShield, false);
    }
    collect();
    assert.equal(runner.blueVaccinesCollected, 3);
    assert.equal(runner.hasVirusShield, true);
    assert.equal(runner.tRex.shieldAnimationTime, 0);
    runner.tRex.update(140);
    assert.equal(drawnImage, runner.images.SHIELD_ACTIVATION);
    collect();
    assert.equal(runner.blueVaccinesCollected, 3);
    assert.equal(runner.tRex.shieldAnimationTime, 140);
    runner.tRex.update(9 * 140);
    runner.tRex.update(0);
    assert.equal(runner.tRex.shieldAnimationTime, null);
    assert.equal(drawnImage, runner.tRex.image);
    assert.equal(runner.hasVirusShield, true);
    assert.equal(runner.absorbVirusCapture(), true);
    assert.equal(runner.blueVaccinesCollected, 0);
    assert.equal(runner.cloneSlowStacks, 2);
    for (let count = 1; count <= 3; count++) {
      collect();
      assert.equal(runner.hasVirusShield, count === 3);
    }
    assert.equal(runner.tRex.shieldAnimationTime, 0);
  }
});

test('throw plays all GIF frames once, returns to normal and clears on restart', () => {
  const game = loadGame();
  game.startFromMenu('normal');
  const runner = game.runner;
  runner.started = true;
  runner.tRex.reset();
  runner.throwPowerUp();
  assert.equal(runner.tRex.throwAnimationTime, null);
  runner.hasPowerUp = true;
  runner.storedPowerUpType = 'blue';
  runner.throwPowerUp();
  assert.equal(runner.powerUpProjectile.type, 'blue');
  let drawn;
  runner.canvasCtx.drawImage = (...args) => { drawn = args; };
  for (let frame = 0; frame < 3; frame++) {
    runner.tRex.update(200);
    assert.equal(drawn[0], runner.images.THROW);
    assert.equal(drawn[1], frame * 47);
  }
  runner.tRex.update(0);
  assert.equal(drawn[0], runner.tRex.image);
  assert.equal(runner.tRex.throwAnimationTime, null);
  runner.tRex.throwAnimationTime = 80;
  runner.gameOver();
  runner.restart();
  assert.equal(runner.tRex.throwAnimationTime, null);
});

test('footsteps alternate, accelerate with sprint and stop in the air or on pause', () => {
  const game = loadGame();
  game.startFromMenu('normal');
  const runner = game.runner;
  runner.started = true;
  runner.tRex.reset();
  runner.soundFx = { STEP_ONE: 'left', STEP_TWO: 'right', THROW: 'throw' };
  const heard = [];
  runner.playSound = (sound, volume) => heard.push([sound, volume]);
  runner.updateFootsteps(1000);
  assert.equal(heard.length, 0);
  runner.config.FOOTSTEP_SOUNDS = true;
  runner.updateFootsteps(259);
  assert.equal(heard.length, 0);
  runner.updateFootsteps(1);
  runner.updateFootsteps(260);
  assert.deepEqual(heard, [['left', 0.015], ['right', 0.015]]);
  runner.speedBoostActive = true;
  runner.updateFootsteps(160);
  assert.equal(heard.length, 3);
  runner.tRex.jumping = true;
  runner.updateFootsteps(1000);
  runner.tRex.jumping = false;
  runner.paused = true;
  runner.updateFootsteps(1000);
  assert.equal(heard.length, 3);
  runner.hasPowerUp = true;
  runner.storedPowerUpType = 'blue';
  runner.throwPowerUp();
  assert.deepEqual(heard[3], ['throw', 0.012]);
});

test('vaccine audio fades in and out and stops after its short duration', () => {
  const game = loadGame();
  game.runner.config.SOUND_ENABLED = true;
  const events = [];
  let started = false;
  const source = { playbackRate: {}, connect() {},
    start() { started = true; events.push(['start']); },
    stop(time) {
      if (!started) throw new Error('InvalidStateError: stop called before start');
      events.push(['stop', time]);
    }
  };
  const gain = { gain: {
    setValueAtTime: (value, time) => events.push(['set', value, time]),
    linearRampToValueAtTime: (value, time) => events.push(['ramp', value, time])
  }, connect() {} };
  game.runner.audioContext = { currentTime: 10, state: 'running',
    createBufferSource: () => source, createGain: () => gain };
  game.runner.playSound({}, 0.018, 0.12, 1.2);
  assert.equal(source.playbackRate.value, 1.2);
  assert.deepEqual(events, [['set', 0, 10], ['ramp', 0.018, 10.01],
    ['ramp', 0, 10.12], ['start'], ['stop', 10.12]]);
});

test('embedded sound assets match the downloaded audio files', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const names = ['tone1.ogg', 'lowDown.ogg', 'powerUp1.ogg', 'tone1.ogg', 'pepSound1.ogg', 'pepSound2.ogg', 'tone1.ogg', 'tone1.ogg'];
  const sounds = [...html.matchAll(/src="data:audio\/(?:ogg|mpeg);base64,([^"]+)"/g)];
  assert.equal(sounds.length, names.length);
  sounds.forEach((match, i) => {
    const bytes = Buffer.from(match[1], 'base64');
    assert.ok(bytes.length > 1000);
    if (names[i].endsWith('.ogg')) assert.equal(bytes.subarray(0, 4).toString(), 'OggS');
    assert.deepEqual(bytes, fs.readFileSync(path.join(__dirname, '../audio', names[i])));
  });
});

function loadGame(width = 1500) {
  let now = 1000;
  let nextId = 0;
  const frames = new Map();
  const elements = new Map();
  const timers = new Map();
  const storyHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').split('id="intro-story"')[1].split('</div>')[0];
  const paragraphs = [...storyHtml.matchAll(/<p hidden>(.*?)<\/p>/g)].map(match => ({ hidden: true, textContent: match[1] }));
  const ctx = new Proxy({ measureText: () => ({ width: 90 }) }, {
    get: (target, key) => key in target ? target[key] : () => {}
  });
  function element(id) {
    const classes = new Set();
    const listeners = new Map();
    return {
      hidden: id === 'intro-start', open: false, tagName: 'DIV',
      scrollTop: 0, scrollHeight: 600, clientHeight: 600,
      getAttribute(name) { return name === 'data-game-mode' ? this.dataset.gameMode : null; },
      dispatch(type, event = {}) {
        event = { target: this, stopPropagation() {}, preventDefault() {}, ...event };
        (listeners.get(type) || []).forEach(fn => fn.call(this, event));
      },
      showModal() { this.open = true; }, close() { this.open = false; },
      id, style: {}, dataset: {}, width: 600, height: 150,
      get offsetWidth() { return parseFloat(this.style.width) || 600; },
      complete: true, naturalWidth: 1000, naturalHeight: 1000,
      classList: { add: x => classes.add(x), remove: x => classes.delete(x),
        contains: x => classes.has(x), toggle() {} },
      getContext: () => ctx, appendChild() {},
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      focus() { sandbox.document.activeElement = this; },
      blur() { sandbox.document.activeElement = null; },
      querySelector: () => null,
      querySelectorAll: () => id === 'intro-story' ? paragraphs : []
    };
  }
  const buttons = ['normal', 'infinite', 'dev'].map(mode => {
    const button = element(mode);
    button.dataset.gameMode = mode;
    button.tagName = 'BUTTON';
    return button;
  });
  const motion = { matches: false, addEventListener() {} };
  const sandbox = {
    navigator: { userAgent: '' }, devicePixelRatio: 1, innerWidth: width,
    innerHeight: 375, performance: { now: () => now },
    document: {
      body: { appendChild() {} }, activeElement: null,
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element(id));
        return elements.get(id);
      },
      querySelector() { return this.getElementById('main-frame-error'); },
      querySelectorAll: selector => selector === '[data-game-mode]' ? buttons : [], createElement: element, addEventListener() {}
    },
    getComputedStyle: () => ({ paddingLeft: '0px' }),
    matchMedia: query => query === '(prefers-reduced-motion: reduce)' ? motion : ({ matches: false }), addEventListener() {},
    setTimeout(fn, delay) { const id = ++nextId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    clearInterval() {},
    requestAnimationFrame(fn) { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../intro.js'), 'utf8'), sandbox);
  sandbox.runner.loadSounds = () => {};
  return { ...sandbox, frames, buttons, paragraphs, motion,
    advanceTimers(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
      }
      now = end;
    }, advance(ms = 1000 / 60) {
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(fn => fn());
  } };
}

test('Normal menu shows the story before reusing the original game start', () => {
  const game = loadGame();
  const intro = game.document.getElementById('normal-intro');
  const start = game.document.getElementById('intro-start');
  assert.equal(intro.open, false);
  assert.equal(game.normalIntro.active, false);
  game.buttons[0].dispatch('click');
  assert.equal(game.normalIntro.active, true);
  assert.equal(game.runner.activated, false);
  game.advanceTimers(360);
  assert.equal(intro.open, true);
  assert.equal(start.hidden, true);
  const firstBlock = game.paragraphs.filter(p => !p.hidden).length;
  assert.ok(firstBlock > 0 && firstBlock < game.paragraphs.length);
  game.runner.onVisibilityChange({ type: 'focus' });
  assert.equal(game.frames.size, 0);
  game.document.getElementById('intro-story').dispatch('click');
  assert.ok(game.paragraphs.filter(p => !p.hidden).length > firstBlock);
  game.document.getElementById('intro-skip').dispatch('click');
  assert.equal(game.paragraphs.every(p => !p.hidden), true);
  assert.equal(start.hidden, false);
  assert.equal(game.runner.activated, false);
  start.dispatch('click');
  start.dispatch('click');
  game.advanceTimers(360);
  assert.equal(intro.open, false);
  assert.equal(game.normalIntro.active, false);
  assert.equal(game.runner.gameMode, 'normal');
  assert.equal(game.runner.activated, true);
  assert.equal(game.frames.size, 1);
});

test('Infinite and Dev menu paths bypass the story, retaining the Dev password', () => {
  const infinite = loadGame();
  infinite.buttons[1].dispatch('click');
  assert.equal(infinite.runner.gameMode, 'infinite');
  assert.equal(infinite.runner.activated, true);
  assert.equal(infinite.normalIntro.active, false);
  const dev = loadGame();
  dev.buttons[2].dispatch('click');
  assert.equal(dev.document.getElementById('dev-dialog').open, true);
  assert.equal(dev.runner.activated, false);
  // Read the existing credential without introducing a second value to maintain.
  const source = fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8');
  dev.document.getElementById('dev-password').value = source.match(/devPassword.value !== '([^']+)'/)[1];
  dev.document.getElementById('dev-form').dispatch('submit');
  assert.equal(dev.runner.gameMode, 'dev');
  assert.equal(dev.runner.activated, true);
  assert.equal(dev.normalIntro.active, false);
});

test('story completes automatically, Escape skips text and reduced motion reveals it immediately', () => {
  for (const mode of ['automatic', 'escape', 'reduced']) {
    const game = loadGame();
    game.motion.matches = mode === 'reduced';
    game.buttons[0].dispatch('click');
    game.advanceTimers(mode === 'reduced' ? 0 : 360);
    if (mode === 'escape') game.document.getElementById('normal-intro').dispatch('keydown', { key: 'Escape' });
    if (mode === 'automatic') game.advanceTimers(180000);
    assert.equal(game.paragraphs.every(p => !p.hidden), true);
    assert.equal(game.document.getElementById('intro-start').hidden, false);
    assert.equal(game.runner.activated, false);
  }
});

test('Dev starts without items and keeps one animation loop after focus', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  for (let i = 0; i < 60; i++) game.advance();
  assert.equal(game.runner.hasVirusShield, false);
  assert.equal(game.runner.blueVaccinesCollected, 0);
  assert.equal(game.runner.hasPowerUp, false);
  assert.equal(game.runner.powerUp, null);
  assert.equal(game.runner.crashed, false);
  assert.equal(game.frames.size, 1);
  game.runner.onVisibilityChange({ type: 'focus' });
  game.runner.onVisibilityChange({ type: 'focus' });
  assert.equal(game.frames.size, 1);
  game.runner.stop();
  assert.equal(game.frames.size, 0);
  game.advance(60000);
  game.runner.play();
  assert.equal(game.frames.size, 1);
  assert.equal(game.runner.paused, false);
  assert.equal(game.runner.hasVirusShield, false);
});

test('Dev hotkeys grant a reusable shield and launch an instant-kill vaccine', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  const runner = game.runner;
  runner.started = true;
  runner.tRex.reset();
  const press = key => runner.onKeyDown({ key, preventDefault() {} });
  press('n');
  assert.equal(runner.hasVirusShield, true);
  assert.equal(runner.blueVaccinesCollected, 3);
  assert.equal(runner.tRex.shieldAnimationTime, 0);
  assert.equal(runner.hasPowerUp, false);
  assert.equal(runner.absorbVirusCapture(), true);
  press('N');
  assert.equal(runner.hasVirusShield, true);
  runner.cloneStunRemaining = 0;
  runner.companionDrawX = runner.tRex.xPos - 60;
  press('m');
  assert.equal(runner.powerUpProjectile.instakill, true);
  assert.equal(runner.cloneHealth, 3);
  runner.updatePowerUp(16);
  assert.equal(runner.cloneHealth, 0);
  assert.equal(runner.cloneDefeated, true);
  assert.equal(runner.crashed, true);
  runner.restart();
  assert.equal(runner.hasVirusShield, false);
  assert.equal(runner.hasPowerUp, false);
  assert.equal(runner.powerUpProjectile, null);
});

test('Dev shortcuts are ignored outside Dev, when paused, or after defeat', () => {
  for (const mode of ['normal', 'infinite', 'dev']) {
    const game = loadGame();
    game.startFromMenu(mode);
    const runner = game.runner;
    runner.started = true;
    for (const state of mode === 'dev' ? ['paused', 'crashed'] : ['playing']) {
      runner.paused = state === 'paused';
      runner.crashed = state === 'crashed';
      for (const key of ['m', 'M', 'n', 'N']) runner.onKeyDown({ key, preventDefault() {} });
      assert.equal(runner.powerUpProjectile, null);
      assert.equal(runner.hasVirusShield, false);
    }
  }
});

test('entering Dev after a paused menu does not apply the menu waiting time', () => {
  const game = loadGame();
  game.runner.stop();
  game.advance(60000);
  game.startFromMenu('dev');
  assert.equal(game.runner.paused, false);
  assert.equal(game.runner.tRex.jumping, true);
  assert.ok(game.runner.tRex.yPos >= 0);
  assert.equal(game.frames.size, 1);
});

test('shield animation advances once per frame while jumping', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  game.runner.started = true;
  game.runner.collectBlueVaccine();
  for (let i = 0; i < 2; i++) game.runner.collectBlueVaccine();
  game.advance(16);
  assert.equal(game.runner.tRex.shieldAnimationTime, 16);
});

test('shield absorbs capture once and can be earned again', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  game.runner.collectBlueVaccine();
  for (let i = 0; i < 2; i++) game.runner.collectBlueVaccine();
  assert.equal(game.runner.absorbVirusCapture(), true);
  assert.equal(game.runner.absorbVirusCapture(), false);
  assert.equal(game.runner.blueVaccinesCollected, 0);
  for (let i = 0; i < 3; i++) game.runner.collectBlueVaccine();
  assert.equal(game.runner.hasVirusShield, true);
});

test('Dev keeps drawing on a narrow screen when the blue pickup delays obstacles', () => {
  const game = loadGame(780);
  game.startFromMenu('dev');
  game.runner.started = true;
  game.runner.tRex.reset();
  game.runner.powerUp = { x: game.runner.tRex.xPos + 50,
    y: game.runner.tRex.groundYPos + 30, type: 'blue' };
  for (let i = 0; i < 600 && game.runner.blueVaccinesCollected === 0; i++) game.advance();
  assert.equal(game.runner.hasVirusShield, false);
  assert.equal(game.runner.blueVaccinesCollected, 1);
  assert.equal(game.runner.crashed, false);
  assert.equal(game.frames.size, 1);
  const distance = game.runner.distanceRan;
  game.advance();
  assert.ok(game.runner.distanceRan > distance);
});

test('an empty obstacle list is safe while space is reserved for a pickup', () => {
  const game = loadGame();
  game.startFromMenu('normal');
  game.runner.started = true;
  game.runner.runningTime = game.runner.config.CLEAR_TIME + 1;
  game.runner.powerUp = { x: game.runner.dimensions.WIDTH, y: 100, type: 'blue' };
  const distance = game.runner.distanceRan;
  game.advance();
  assert.equal(game.runner.horizon.obstacles.length, 0);
  assert.equal(game.frames.size, 1);
  assert.ok(game.runner.distanceRan > distance);
});

test('blue hits stack across shield consumption, remain visible and reset on restart', () => {
  const game = loadGame(780);
  game.startFromMenu('dev');
  const runner = game.runner;
  runner.started = true;
  runner.tRex.reset();
  runner.collectBlueVaccine();
  for (let i = 0; i < 2; i++) game.runner.collectBlueVaccine();
  for (let hit = 1; hit <= 4; hit++) {
    runner.cloneStunRemaining = 0;
    runner.companionDrawX = runner.tRex.xPos - 60;
    runner.hasPowerUp = true;
    runner.storedPowerUpType = 'blue';
    runner.throwPowerUp();
    runner.updatePowerUp(16);
    assert.equal(runner.powerUpProjectile, null);
    assert.equal(runner.cloneSlowStacks, Math.min(hit, 3));
    if (hit === 1) {
      assert.equal(runner.absorbVirusCapture(), true);
      assert.equal(runner.cloneSlowStacks, 1);
      assert.equal(runner.blueVaccinesCollected, 0);
    }
  }
  runner.drawPowerUpIndicator();
  assert.equal(game.document.getElementById('hud-slow').textContent, 'x3');
  runner.stop();
  runner.restart();
  assert.equal(runner.cloneSlowStacks, 0);
});
