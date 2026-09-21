const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  const ctx = new Proxy({ measureText: () => ({ width: 90 }) }, {
    get: (target, key) => key in target ? target[key] : () => {}
  });
  function element(id) {
    const classes = new Set();
    return {
      id, style: {}, dataset: {}, width: 600, height: 150,
      get offsetWidth() { return parseFloat(this.style.width) || 600; },
      complete: true, naturalWidth: 1000, naturalHeight: 1000,
      classList: { add: x => classes.add(x), remove: x => classes.delete(x),
        contains: x => classes.has(x), toggle() {} },
      getContext: () => ctx, appendChild() {}, addEventListener() {}, focus() {},
      querySelector: () => null, querySelectorAll: () => []
    };
  }
  const sandbox = {
    navigator: { userAgent: '' }, devicePixelRatio: 1, innerWidth: width,
    innerHeight: 375, performance: { now: () => now },
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element(id));
        return elements.get(id);
      },
      querySelector() { return this.getElementById('main-frame-error'); },
      querySelectorAll: () => [], createElement: element, addEventListener() {}
    },
    getComputedStyle: () => ({ paddingLeft: '0px' }),
    matchMedia: () => ({ matches: false }), addEventListener() {},
    clearInterval() {},
    requestAnimationFrame(fn) { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../game.js'), 'utf8'), sandbox);
  sandbox.runner.loadSounds = () => {};
  return { ...sandbox, frames, advance(ms = 1000 / 60) {
    now += ms;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach(fn => fn());
  } };
}

test('Dev collects its starter blue syringe and keeps one animation loop after focus', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  for (let i = 0; i < 240; i++) game.advance();
  assert.equal(game.runner.hasVirusShield, false);
  assert.equal(game.runner.blueVaccinesCollected, 1);
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
  for (let i = 0; i < 240; i++) game.advance();
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
  runner.testShieldPending = false;
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
