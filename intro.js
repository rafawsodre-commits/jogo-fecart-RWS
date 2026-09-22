// INTRODUÇÃO DO MODO NORMAL
(function() {
  'use strict';
  var dialog = document.getElementById('normal-intro');
  var fade = document.getElementById('intro-fade');
  var story = document.getElementById('intro-story');
  var paragraphs = Array.from(story.querySelectorAll('p'));
  var start = document.getElementById('intro-start');
  var skip = document.getElementById('intro-skip');
  var hint = document.getElementById('intro-hint');
  var status = document.getElementById('intro-status');
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var timer = null;
  var index = 0;
  var transitioning = false;

  function transition(change, done) {
    transitioning = true;
    fade.classList.add('is-visible');
    setTimeout(function() {
      change();
      fade.classList.remove('is-visible');
      setTimeout(function() {
        transitioning = false;
        done();
      }, motion.matches ? 0 : 180);
    }, motion.matches ? 0 : 180);
  }

  function reveal(all) {
    clearTimeout(timer);
    var follow = story.scrollHeight - story.scrollTop - story.clientHeight < 60;
    var end = all ? paragraphs.length : Math.min(index + 1, paragraphs.length);
    while (index < end) paragraphs[index++].hidden = false;
    if (follow && !all) story.scrollTop = story.scrollHeight;
    if (index === paragraphs.length) {
      start.hidden = false;
      skip.hidden = true;
      hint.textContent = 'História completa. Você pode reler o texto ou iniciar a partida.';
      status.textContent = 'História completa. Botão Iniciar partida disponível.';
      if (document.activeElement === skip) start.focus();
    } else {
      var readingTime = Math.max(1800, paragraphs[index - 1].textContent.trim().split(/\s+/).length * 300);
      timer = setTimeout(function() { reveal(false); }, readingTime);
    }
  }

  window.normalIntro = {
    active: false,
    open: function() {
      if (this.active) return;
      this.active = true;
      runner.stop();
      mobileControls.hidden = true;
      document.getElementById('game-hud').hidden = true;
      index = 0;
      paragraphs.forEach(function(p) { p.hidden = true; });
      start.hidden = true;
      skip.hidden = false;
      status.textContent = '';
      hint.textContent = 'Clique no texto ou pressione ENTER/ESPAÇO para acelerar. ESC revela toda a história.';
      transition(function() {
        startScreen.classList.add('is-hidden');
        dialog.showModal();
        // A camada de transição deve ficar acima do diálogo na top layer.
        dialog.appendChild(fade);
        story.scrollTop = 0;
        document.getElementById('intro-title').focus();
      }, function() { reveal(motion.matches); });
    }
  };

  story.addEventListener('click', function() {
    if (!transitioning) reveal(false);
  });
  skip.addEventListener('click', function() { reveal(true); });
  dialog.addEventListener('cancel', function(event) {
    event.preventDefault();
    if (!transitioning) reveal(true);
  });
  dialog.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ') &&
        event.target.tagName !== 'BUTTON')) {
      event.preventDefault();
      event.stopPropagation();
      if (!transitioning && !event.repeat) reveal(event.key === 'Escape');
    }
  });
  start.addEventListener('click', function() {
    if (transitioning || start.hidden || !window.normalIntro.active) return;
    clearTimeout(timer);
    transition(function() {
      document.body.appendChild(fade);
      dialog.close();
    }, function() {
      window.normalIntro.active = false;
      startFromMenu('normal');
      // Retira o foco do botão do menu para que ESPAÇO continue sendo pulo.
      startScreen.inert = true;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      startScreen.inert = false;
    });
  });
  motion.addEventListener('change', function() {
    if (motion.matches && window.normalIntro.active && !transitioning) reveal(true);
  });
})();
