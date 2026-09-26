// INTRODUÇÃO DO MODO NORMAL
(function() {
  'use strict';
  var dialog = document.getElementById('normal-intro');
  var fade = document.getElementById('intro-fade');
  var story = document.getElementById('intro-story');
  var paragraphs = Array.from(story.querySelectorAll('p'));
  var introParagraphs = paragraphs.slice();
  var victoryArt = document.createElement('img');
  victoryArt.id = 'ending-art';
  victoryArt.src = 'New%20Piskel%20(12).gif';
  victoryArt.alt = 'Animação de vitória: você derrotou o vírus.';
  victoryArt.width = 128;
  victoryArt.height = 128;
  var ending = false;
  var tutorial = false;
  var tutorialLines = [
    'Você avança automaticamente. Pule os obstáculos com ESPAÇO ou ↑.',
    'Segure → para correr mais rápido e solte para recuperar o fôlego.',
    'Pegue as vacinas e pressione ← para lançá-las no Virocrata-19. As vermelhas tiram vida dele: acerte três para vencer. Não deixe ele te alcançar!',
    'No celular, use os botões PULAR, CORRER e LANÇAR na tela.'
  ];
  var endingLines = [
    'Eu consegui.',
    'As vacinas que encontrei pelo hospital foram enfraquecendo o Virocrata-19 até ele cair.',
    'Mas, quando olhei para trás, não consegui sentir que aquilo era uma vitória.',
    'Vi quartos abandonados, macas paradas e pessoas que não conseguiram sair daquele hospital.',
    'Eu tive sorte.',
    'Encontrei a vacina.',
    'Consegui sair.',
    'Mas nem todos tiveram a mesma chance.',
    'Será que o próximo governador vai melhorar essa situação? Ou vão ser só mais promessas?',
    'Eu não tinha essa resposta. Só sabia que, naquele hospital, sobreviver tinha sido uma questão de sorte.',
    'MAS VIVER NÃO DEVERIA SER UM PRIVILÉGIO.',
    'FIM.'
  ];
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
    if (tutorial) return;
    clearTimeout(timer);
    var follow = story.scrollHeight - story.scrollTop - story.clientHeight < 60;
    var end = all ? paragraphs.length : Math.min(index + 1, paragraphs.length);
    while (index < end) paragraphs[index++].hidden = false;
    if (ending && index === paragraphs.length) victoryArt.hidden = false;
    if (follow && !all) story.scrollTop = story.scrollHeight;
    if (index === paragraphs.length) {
      start.hidden = false;
      skip.hidden = true;
      hint.textContent = ending ? 'Fim. Você pode reler o texto ou voltar ao menu.' : 'História completa. Continue para ver como jogar.';
      status.textContent = ending ? 'Final completo. Botão Voltar ao menu disponível.' : 'História completa. Botão Continuar disponível.';
      if (document.activeElement === skip) start.focus();
    } else {
      var readingTime = Math.max(1800, paragraphs[index - 1].textContent.trim().split(/\s+/).length * 300);
      timer = setTimeout(function() { reveal(false); }, readingTime);
    }
  }

  window.normalIntro = {
    active: false,
    open: function(isEnding) {
      if (this.active) return;
      this.active = true;
      ending = isEnding === true;
      tutorial = false;
      clearTimeout(timer);
      paragraphs = ending ? endingLines.map(function(line) {
        var paragraph = document.createElement('p');
        paragraph.textContent = line;
        return paragraph;
      }) : introParagraphs;
      victoryArt.hidden = true;
      var storyContent = paragraphs.slice();
      if (ending) {
        paragraphs[paragraphs.length - 1].id = 'ending-fim';
        storyContent.splice(storyContent.length - 1, 0, victoryArt);
      }
      story.replaceChildren.apply(story, storyContent);
      document.getElementById('intro-title').textContent = ending ? 'VIROCRATA-19 DERROTADO' : 'VIROCRATA-19';
      start.textContent = ending ? '[ VOLTAR AO MENU ]' : '[ CONTINUAR ]';
      skip.textContent = ending ? 'REVELAR TODO O TEXTO' : 'PULAR INTRODUÇÃO';
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
        gameOverScreen.classList.add('is-hidden');
        dialog.showModal();
        // A camada de transição deve ficar acima do diálogo na top layer.
        dialog.appendChild(fade);
        story.scrollTop = 0;
        document.getElementById('intro-title').focus();
      }, function() { reveal(motion.matches); });
    }
  };

  function showTutorial() {
    if (transitioning || tutorial) return;
    clearTimeout(timer);
    tutorial = true;
    transition(function() {
      var instructions = tutorialLines.map(function(line) {
        var paragraph = document.createElement('p');
        paragraph.textContent = line;
        return paragraph;
      });
      story.replaceChildren.apply(story, instructions);
      story.scrollTop = 0;
      document.getElementById('intro-title').textContent = 'COMO JOGAR';
      skip.hidden = true;
      start.hidden = false;
      start.textContent = '[ INICIAR PARTIDA ]';
      hint.textContent = 'Leia os controles e, quando estiver pronto, inicie a partida.';
      status.textContent = 'Tutorial. Botão Iniciar partida disponível.';
      document.getElementById('intro-title').focus();
    }, function() {});
  }

  window.normalEnding = {
    open: function() {
      if ((runner.gameMode === 'normal' || runner.gameMode === 'dev') && runner.crashed) window.normalIntro.open(true);
    }
  };

  story.addEventListener('click', function() {
    if (!transitioning) reveal(false);
  });
  skip.addEventListener('click', function() {
    if (transitioning) return;
    if (ending) reveal(true);
    else showTutorial();
  });
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
    if (!ending && !tutorial) {
      showTutorial();
      return;
    }
    clearTimeout(timer);
    transition(function() {
      document.body.appendChild(fade);
      dialog.close();
    }, function() {
      window.normalIntro.active = false;
      if (ending) returnToMenu();
      else startFromMenu('normal');
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
