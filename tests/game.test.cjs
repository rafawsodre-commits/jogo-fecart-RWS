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

test('one-shot scenery activates at one health without resetting the corridor and resets on restart', () => {
  const game = loadGame();
  game.startFromMenu('normal');
  const line = game.runner.horizon.horizonLine;
  const draws = [];
  line.canvasCtx.drawImage = (...args) => draws.push(args);
  line.corridorTravel = 123;
  for (const health of [3, 2, 1]) {
    game.runner.cloneHealth = health;
    draws.length = 0;
    line.draw();
    assert.equal(draws.some(args => args[0].id === 'corridor-one-shot'), health === 1);
    assert.equal(line.corridorTravel, 123);
  }
  const sections = line.corridorSections;
  line.update(1000 / 60, 4.5);
  assert.equal(line.corridorTravel, 127.5);
  assert.equal(line.corridorSections[0], sections[0]);
  line.oneShotImage.complete = false;
  draws.length = 0;
  line.draw();
  assert.equal(draws.some(args => args[0].id === 'corridor-one-shot'), false);
  line.oneShotImage.complete = true;
  game.runner.stop();
  game.runner.restart();
  draws.length = 0;
  line.draw();
  assert.equal(game.runner.cloneHealth, 3);
  assert.equal(draws.some(args => args[0].id === 'corridor-one-shot'), false);
});

test('Virocrata uses the animated hyper form only at one health and resets on restart', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  const runner = game.runner;
  const draws = [];
  runner.canvasCtx.drawImage = (...args) => draws.push(args);
  for (const health of [3, 2, 1]) {
    runner.cloneHealth = health;
    draws.length = 0;
    runner.drawCompanion(80);
    const draw = draws.find(args => args[0].id === (health === 1 ? 'hyper-clone-sprite' : 'clone-sprite'));
    assert.ok(draw);
    assert.equal(draw[1], runner.cloneSourceX);
  }
  runner.stop();
  runner.restart();
  draws.length = 0;
  runner.drawCompanion(80);
  assert.ok(draws.some(args => args[0].id === 'clone-sprite'));
  assert.equal(draws.some(args => args[0].id === 'hyper-clone-sprite'), false);
});

test('hospital restoration blends the complete normal scene at the walking opacity', () => {
  const game = loadGame();
  game.startFromMenu('normal');
  game.runner.gameOver(true);
  const line = game.runner.horizon.horizonLine;
  const ctx = line.canvasCtx;
  const blends = [];
  ctx.drawImage = image => {
    if (image === line.restoreCanvas) blends.push(ctx.globalAlpha);
  };
  for (const progress of [0.01, 0.25, 0.5, 0.75, 0.99]) {
    game.runner.escapeRestore = progress;
    line.drawCorridor();
    assert.equal(line.canvasCtx, ctx);
  }
  assert.deepEqual(blends, [0.01, 0.25, 0.5, 0.75, 0.99]);
});

test('exit doorway reserves space against hospital furniture and wall decorations', () => {
  const game = loadGame();
  game.startFromMenu('normal');
  const runner = game.runner;
  runner.gameOver(true);
  runner.escapeDoorX = 170;
  const line = runner.horizon.horizonLine;
  line.corridorTravel = 0;
  line.corridorEnd = 2000;
  line.corridorSections = [{ x: 0, width: 500, seed: 0, variant: 0,
    picture: true, pictureX: 180, pictureY: 53 }];
  const draws = [];
  line.canvasCtx.drawImage = (...args) => draws.push(args);
  line.drawCorridor(false);
  assert.ok(draws.length > 0);
  assert.ok(draws.every(args => args[5] >= 246 || args[5] + args[7] <= 136));
  runner.escapeActive = false;
  draws.length = 0;
  line.drawCorridor(false);
  assert.ok(draws.some(args => args[5] < 246 && args[5] + args[7] > 136));
});

test('death resumes after focus and missing animation assets do not strand the white screen', () => {
  const game = loadGame();
  game.startFromMenu('dev');
  const runner = game.runner;
  runner.cloneHealth = 0;
  runner.gameOver(true);
  game.advance(100);
  runner.onVisibilityChange({ type: 'blur' });
  const remaining = runner.deathRemaining;
  game.advance(30000);
  assert.equal(runner.deathRemaining, remaining);
  runner.onVisibilityChange({ type: 'focus' });
  assert.equal(game.frames.size, 1);
  for (const id of ['death-sprite', 'virocrata-remains']) {
    game.document.getElementById(id).complete = false;
    game.document.getElementById(id).naturalWidth = 0;
  }
  const ctx = game.document.getElementById('virocrata-death-camera').getContext('2d');
  ctx.drawImage = image => {
    if (image.complete === false) throw new Error('Image is not drawable');
  };
  game.advance(100);
  // Restore the remains before the walking scene, which uses this asset too.
  game.document.getElementById('virocrata-remains').complete = true;
  game.document.getElementById('virocrata-remains').naturalWidth = 97;
  game.advance(remaining);
  assert.equal(game.document.getElementById('virocrata-death').hidden, true);
  assert.equal(runner.escapeActive, true);
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
    if (won) {
      game.runner.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
      for (let frame = 0; frame < 400 && game.runner.escapeActive; frame++) game.advance(50);
      game.advanceTimers(360);
      game.document.getElementById('normal-intro').dispatch('cancel');
      game.document.getElementById('intro-start').dispatch('click');
      game.advanceTimers(360);
      game.startFromMenu('normal');
    } else game.runner.restart();
    assert.equal(hud.hidden, false);
  }
});

test('victory walks to the exit before showing the ending and restart restores player position', () => {
  const game = loadGame(844, true);
  game.startFromMenu('infinite');
  const runner = game.runner;
  const startX = runner.tRex.xPos;
  runner.gameOver(true);
  assert.equal(runner.escapeActive, true);
  assert.equal(game.document.getElementById('game-over-screen').classList.contains('is-hidden'), true);
  const distance = runner.distanceRan;
  for (let i = 0; i < 140; i++) game.advance(50);
  assert.equal(runner.tRex.xPos, startX);
  assert.equal(runner.escapeEntering, null);
  game.touchButtons[1].dispatch('pointerdown', { pointerId: 30 });
  for (let i = 0; i < 50; i++) game.advance(50);
  assert.ok(runner.tRex.xPos > startX);
  game.touchButtons[1].dispatch('pointerup', { pointerId: 30 });
  const stoppedX = runner.tRex.xPos;
  game.advance(50);
  assert.equal(runner.tRex.xPos, stoppedX);
  assert.equal(runner.distanceRan, distance);
  runner.onKeyUp({ keyCode: 32 });
  assert.equal(runner.escapeActive, true);
  runner.onVisibilityChange({ type: 'blur' });
  assert.equal(game.frames.size, 0);
  const elapsed = runner.escapeElapsed;
  game.advance(30000);
  runner.onVisibilityChange({ type: 'focus' });
  game.advance(16);
  assert.ok(runner.escapeElapsed - elapsed <= 16);
  game.window.innerWidth = 390;
  game.window.innerHeight = 844;
  game.fitGameToWindow();
  runner.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
  for (let i = 0; i < 120; i++) game.advance(50);
  assert.equal(runner.escapeActive, false);
  assert.equal(game.frames.size, 0);
  assert.equal(game.document.getElementById('escape-light').hidden, true);
  assert.equal(game.document.getElementById('game-over-screen').classList.contains('is-hidden'), false);
  assert.equal(game.document.getElementById('game-over-title').textContent, 'VOCÊ ENCONTROU A SAÍDA.');
  runner.restart();
  assert.equal(runner.tRex.xPos, runner.tRex.config.START_X_POS);
  assert.equal(game.frames.size, 1);
});

test('reduced motion uses a short exit fade and defeat skips the exit sequence', () => {
  const game = loadGame();
  game.motion.matches = true;
  game.startFromMenu('infinite');
  game.runner.gameOver(true);
  game.runner.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
  for (let i = 0; i < 120; i++) game.advance(50);
  assert.equal(game.runner.escapeActive, false);
  game.runner.restart();
  game.runner.gameOver(false);
  assert.equal(game.runner.escapeActive, false);
  assert.equal(game.frames.size, 0);
  assert.equal(game.document.getElementById('escape-light').hidden, true);
});

test('Normal and Dev victories open the shared ending narrative, then return to the menu', () => {
  for (const mode of ['normal', 'dev', 'infinite']) {
    const game = loadGame();
    game.startFromMenu(mode);
    const runner = game.runner;
    runner.started = true;
    runner.tRex.reset();
    runner.cloneHealth = 1;
    runner.companionDrawX = runner.tRex.xPos - 60;
    runner.hasPowerUp = true;
    runner.storedPowerUpType = 'red';
    runner.throwPowerUp();
    runner.updatePowerUp(16);
    assert.equal(runner.cloneHealth, 0);
    assert.equal(runner.crashed, true);
    assert.equal(game.normalIntro.active, false);
    if (mode !== 'infinite') {
      assert.equal(game.document.getElementById('virocrata-death').hidden, false);
      const distance = runner.distanceRan;
      game.advance(1800);
      const deathDraws = [];
      const deathCtx = game.document.getElementById('virocrata-death-camera').getContext('2d');
      deathCtx.drawImage = (...args) => deathDraws.push(args);
      runner.drawDeathCamera();
      assert.ok(deathDraws.some(args => args[0].id === 'virocrata-remains'));
      assert.equal(deathDraws.some(args => args[0].id === 'death-sprite'), false);
      game.advance(599);
      assert.equal(game.document.getElementById('virocrata-death').hidden, false);
      assert.equal(runner.distanceRan, distance);
      game.advance(1);
      assert.equal(game.document.getElementById('virocrata-death').hidden, true);
    }
    assert.equal(runner.escapeActive, true);
    if (mode === 'infinite') {
      assert.equal(runner.escapeActive, true);
      continue;
    }
    runner.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
    for (let frame = 0; frame < 100; frame++) game.advance(50);
    assert.equal(runner.escapeActive, true);
    assert.equal(runner.escapeEntering, null);
    assert.ok(runner.escapeRestore > 0 && runner.escapeRestore < 1);
    assert.ok(runner.escapeCamera > 0);
    runner.onKeyUp({ keyCode: 39 });
    const walkDistance = runner.escapeWalkDistance;
    const restoration = runner.escapeRestore;
    game.advance(50);
    assert.equal(runner.escapeWalkDistance, walkDistance);
    assert.equal(runner.escapeRestore, restoration);
    runner.onKeyDown({ key: 'ArrowRight', preventDefault() {} });
    for (let frame = 0; frame < 400 && runner.escapeActive; frame++) game.advance(50);
    assert.equal(runner.escapeActive, false);
    assert.equal(runner.escapeRestore, 1);
    assert.equal(game.normalIntro.active, true);
    assert.equal(game.frames.size, 0);
    game.advanceTimers(360);
    const dialog = game.document.getElementById('normal-intro');
    const story = game.document.getElementById('intro-story');
    const action = game.document.getElementById('intro-start');
    assert.equal(dialog.open, true);
    assert.equal(game.document.getElementById('intro-title').textContent, 'VIROCRATA-19 DERROTADO');
    assert.equal(story.children.length, 13);
    assert.equal(story.children[0].textContent, 'Eu consegui.');
    assert.equal(story.children.filter(p => !p.hidden).length, 1);
    story.dispatch('click');
    dialog.dispatch('keydown', { key: 'Enter', target: story });
    dialog.dispatch('keydown', { key: ' ', target: story });
    assert.equal(story.children.filter(p => !p.hidden).length, 4);
    assert.equal(action.hidden, true);
    dialog.dispatch('keydown', { key: 'Escape' });
    assert.ok(story.children.every(p => !p.hidden));
    assert.equal(story.children.at(-1).textContent, 'FIM.');
    assert.equal(action.textContent, '[ VOLTAR AO MENU ]');
    action.dispatch('click');
    game.advanceTimers(360);
    assert.equal(dialog.open, false);
    assert.equal(game.normalIntro.active, false);
    assert.equal(game.document.getElementById('start-screen').classList.contains('is-hidden'), false);
    assert.equal(game.frames.size, 0);
    game.buttons[0].dispatch('click');
    game.advanceTimers(360);
    assert.equal(story.children[0], game.paragraphs[0]);
    assert.equal(action.textContent, '[ CONTINUAR ]');
    assert.equal(game.document.getElementById('intro-title').textContent, 'VIROCRATA-19');
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

test('mobile scene stays between HUD and controls across rotation and safe insets', () => {
  const game = loadGame(390, true);
  game.window.getComputedStyle = element => element.id === 'game-hud' ?
    { top: '24px', height: '88px' } : element.id === 'mobile-controls' ?
    { bottom: '34px', height: '88px', left: '24px', right: '24px' } : { paddingLeft: '0px' };
  game.startFromMenu('infinite');
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [667, 320], [768, 1024]]) {
    game.window.innerWidth = width;
    game.window.innerHeight = height;
    game.fitGameToWindow();
    const style = game.document.getElementById('main-frame-error').style;
    const scale = game.Runner.displayScale;
    assert.ok(parseFloat(style.top) >= 120);
    assert.ok(parseFloat(style.top) + 150 * scale <= height - 134 + 0.01);
    assert.ok(Math.abs(parseFloat(style.width) * scale - (width - 48)) < 0.01);
    assert.equal(game.runner.paused, false);
    assert.equal(game.runner.activated, true);
    assert.equal(game.frames.size, 1);
  }
});

test('mobile supports simultaneous touches, cancellation and resuming after pause', () => {
  const game = loadGame(390, true);
  game.startFromMenu('infinite');
  game.runner.tRex.reset();
  const [jump, run] = game.touchButtons;
  run.dispatch('pointerdown', { pointerId: 1 });
  jump.dispatch('pointerdown', { pointerId: 2 });
  assert.equal(game.runner.sprintKeyHeld, true);
  assert.equal(game.runner.tRex.jumping, true);
  jump.dispatch('pointercancel', { pointerId: 2 });
  assert.equal(game.runner.sprintKeyHeld, true);
  run.dispatch('lostpointercapture', { pointerId: 1 });
  assert.equal(game.runner.sprintKeyHeld, false);
  run.dispatch('pointerdown', { pointerId: 3 });
  game.runner.stop();
  assert.equal(game.runner.sprintKeyHeld, false);
  assert.equal(run.classList.contains('is-pressed'), false);
  run.dispatch('pointerdown', { pointerId: 4 });
  assert.equal(game.runner.paused, false);
  assert.equal(game.runner.sprintKeyHeld, true);
  assert.equal(game.frames.size, 1);
});

test('mobile layout follows the visible viewport when browser chrome changes size', () => {
  const game = loadGame(844, true);
  game.window.visualViewport = { width: 747, height: 345 };
  game.fitGameToWindow();
  const style = game.document.getElementById('main-frame-error').style;
  assert.ok(parseFloat(style.top) + 150 * game.Runner.displayScale <= 233);
  assert.ok(Math.abs(parseFloat(style.width) * game.Runner.displayScale - 723) < 0.01);
});

test('a mobile gesture resumes suspended game audio', () => {
  const game = loadGame(390, true);
  game.startFromMenu('infinite');
  let resumes = 0;
  game.runner.audioContext = { state: 'suspended', resume() { resumes++; return Promise.resolve(); } };
  game.touchButtons[1].dispatch('pointerdown', { pointerId: 1 });
  assert.equal(resumes, 1);
});

function loadGame(width = 1500, touch = false) {
  let now = 1000;
  let nextId = 0;
  const frames = new Map();
  const elements = new Map();
  const timers = new Map();
  const storyHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').split('id="intro-story"')[1].split('</div>')[0];
  const paragraphs = [...storyHtml.matchAll(/<p hidden>(.*?)<\/p>/g)].map(match => ({ hidden: true, textContent: match[1] }));
  const ctx = new Proxy({ measureText: () => ({ width: 90 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }) }, {
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
      getContext: () => ctx, appendChild() {}, setPointerCapture() {},
      replaceChildren(...children) { this.children = children; },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      focus() { sandbox.document.activeElement = this; },
      blur() { sandbox.document.activeElement = null; },
      querySelector: () => null,
      querySelectorAll: () => id === 'intro-story' ? paragraphs : id === 'mobile-controls' ? touchButtons : []
    };
  }
  const buttons = ['normal', 'infinite', 'dev'].map(mode => {
    const button = element(mode);
    button.dataset.gameMode = mode;
    button.tagName = 'BUTTON';
    return button;
  });
  const motion = { matches: false, addEventListener() {} };
  const touchButtons = ['jump', 'run', 'throw'].map(control => {
    const button = element(control);
    button.dataset.control = control;
    return button;
  });
  const sandbox = {
    navigator: { userAgent: '' }, devicePixelRatio: 1, innerWidth: width,
    innerHeight: 375, performance: { now: () => now },
    document: {
      body: element('body'), activeElement: null,
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element(id));
        return elements.get(id);
      },
      querySelector() { return this.getElementById('main-frame-error'); },
      querySelectorAll: selector => selector === '[data-game-mode]' ? buttons : [], createElement: element, addEventListener() {}
    },
    getComputedStyle: () => ({ paddingLeft: '0px' }),
    matchMedia: query => query === '(prefers-reduced-motion: reduce)' ? motion : ({ matches: touch }), addEventListener() {},
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
  return { ...sandbox, frames, buttons, touchButtons, paragraphs, motion,
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
  game.advanceTimers(360);
  assert.equal(game.document.getElementById('intro-title').textContent, 'COMO JOGAR');
  assert.equal(game.document.getElementById('intro-skip').hidden, true);
  intro.dispatch('keydown', { key: 'Escape' });
  assert.equal(intro.open, true);
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
    game.document.getElementById('intro-start').dispatch('click');
    game.advanceTimers(360);
    assert.equal(game.document.getElementById('intro-title').textContent, 'COMO JOGAR');
    assert.equal(game.runner.activated, false);
    assert.equal(game.document.getElementById('intro-start').textContent, '[ INICIAR PARTIDA ]');
    game.document.getElementById('intro-start').dispatch('click');
    game.advanceTimers(360);
    assert.equal(game.runner.activated, true);
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

test('Dev hotkeys grant a reusable shield and vaccines that deal one damage each', () => {
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
  assert.equal(runner.cloneHealth, 3);
  for (const expectedHealth of [2, 1, 0]) {
    press('m');
    assert.equal(runner.powerUpProjectile.type, 'red');
    runner.updatePowerUp(16);
    assert.equal(runner.cloneHealth, expectedHealth);
    assert.equal(runner.cloneDefeated, expectedHealth === 0);
    assert.equal(runner.crashed, expectedHealth === 0);
    if (expectedHealth === 1) {
      assert.equal(game.document.getElementById('transformation-impact').hidden, false);
      game.advance(279);
      assert.equal(game.document.getElementById('transformation-impact').hidden, false);
      game.advance(1);
      assert.equal(game.document.getElementById('transformation-impact').hidden, true);
      assert.equal(game.document.getElementById('critical-jumpscare').hidden, false);
      assert.equal(runner.cloneStunRemaining, 1870);
      assert.equal(runner.cloneFrozenX, runner.companionDrawX);
      const distance = runner.distanceRan;
      game.advance(1869);
      assert.equal(runner.cloneStunRemaining, 1);
      assert.equal(game.document.getElementById('critical-jumpscare').hidden, false);
      game.advance(1);
      assert.equal(runner.distanceRan, distance);
      assert.equal(game.document.getElementById('critical-jumpscare').hidden, true);
      assert.equal(runner.cloneStunRemaining, 0);
      assert.equal(runner.cloneFrozenX, null);
    }
  }
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
