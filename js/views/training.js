// Treino de coordenadas e partidas contra o computador.
import { Chess, sqName } from '../chess.js';
import { Board } from '../board.js';
import { LEVELS, scoreToText, MATE } from '../engine.js';
import { engineMove, engineAnalyse } from '../engine-client.js';
import { h, sound, moveSound, modal, toast } from '../ui.js';
import * as store from '../store.js';

// ---------------- Coordenadas ----------------
export function coordsView(root) {
  const boardWrap = h('div', { class: 'board-wrap' });
  const board = new Board(boardWrap, { coords: false });
  board.setPosition(new Chess());
  const side = h('div', { class: 'panel' });
  root.append(h('div', { class: 'play' }, boardWrap, side));
  let timer = null;
  let color = 'w', showPieces = true;

  function intro() {
    clearInterval(timer);
    board.opts.onSquareClick = null;
    const s = store.get().coords;
    const segColor = h('div', { class: 'segmented' });
    const segPieces = h('div', { class: 'segmented' });
    const draw = () => {
      segColor.innerHTML = '';
      [['w', 'Brancas'], ['b', 'Pretas']].forEach(([v, l]) => segColor.append(h('button', { class: v === color ? 'on' : '', onclick: () => { color = v; board.setOrientation(color); draw(); } }, l)));
      segPieces.innerHTML = '';
      [[true, 'Com peças'], [false, 'Sem peças']].forEach(([v, l]) => segPieces.append(h('button', { class: v === showPieces ? 'on' : '', onclick: () => { showPieces = v; board.setPosition(v ? new Chess() : new Chess('8/8/8/8/8/8/8/8 w - - 0 1')); draw(); } }, l)));
    };
    draw();
    side.innerHTML = '';
    side.append(h('div', { class: 'card' },
      h('h2', {}, 'Coordenadas'),
      h('p', { class: 'muted' }, 'Uma casa aparece na tela: clique nela o mais rápido possível. Você tem 30 segundos. Saber as coordenadas de cor ajuda a ler livros, aulas e a calcular lances.'),
      h('div', { class: 'row' }, segColor, segPieces),
      h('div', { class: 'stats', style: 'margin:16px 0' },
        h('div', { class: 'stat' }, h('b', {}, s.best || 0), h('span', {}, 'Recorde')),
        h('div', { class: 'stat' }, h('b', {}, s.runs || 0), h('span', {}, 'Tentativas')),
      ),
      h('button', { class: 'btn primary block', onclick: run }, 'Começar'),
    ));
  }

  function run() {
    let score = 0, left = 30, misses = 0;
    let target = sqName(Math.floor(Math.random() * 64));
    const targetEl = h('div', { class: 'big-target' }, target);
    const timerEl = h('div', { class: 'timer' }, '0:30');
    const scoreEl = h('div', { class: 'timer' }, '0');
    side.innerHTML = '';
    side.append(h('div', { class: 'card' },
      h('div', { class: 'row' }, h('div', { class: 'stat' }, scoreEl, h('span', {}, 'Acertos')), h('span', { class: 'spacer' }), h('div', { class: 'stat', style: 'text-align:right' }, timerEl, h('span', {}, 'Tempo'))),
    ), h('div', { class: 'card' }, h('div', { class: 'muted small', style: 'text-align:center' }, 'Clique na casa'), targetEl));
    board.opts.onSquareClick = (sq) => {
      if (sq === target) {
        score++;
        scoreEl.textContent = score;
        board.flash(sq, 'good', 250);
        sound.move();
        let n;
        do n = sqName(Math.floor(Math.random() * 64)); while (n === target);
        target = n;
        targetEl.textContent = target;
      } else {
        misses++;
        board.flash(sq, 'bad', 300);
        sound.bad();
      }
    };
    clearInterval(timer);
    timer = setInterval(() => {
      left--;
      timerEl.textContent = `0:${String(left).padStart(2, '0')}`;
      timerEl.classList.toggle('low', left <= 5);
      if (left <= 0) {
        clearInterval(timer);
        board.opts.onSquareClick = null;
        const prev = store.get().coords.best || 0;
        store.update((s) => { s.coords.runs++; s.coords.best = Math.max(prev, score); });
        store.logActivity();
        if (score > prev) sound.win();
        modal({
          icon: score > prev ? '🏆' : '🎯',
          title: `${score} acerto${score === 1 ? '' : 's'}`,
          body: `${misses} erro(s). ${score > prev ? '**Novo recorde!**' : `Recorde: **${prev}**.`}`,
          actions: [{ label: 'Menu', onClick: intro }, { label: 'De novo', primary: true, onClick: run }],
        });
      }
    }, 1000);
  }

  intro();
  return () => { clearInterval(timer); board.destroy(); };
}

// ---------------- Contra o computador ----------------
export function computerView(root) {
  const boardWrap = h('div', { class: 'board-wrap' });
  const board = new Board(boardWrap, {});
  const side = h('div', { class: 'panel' });
  root.append(h('div', { class: 'play' }, boardWrap, side));
  let alive = true;
  let game = null; // { chess, player, level, over }
  let searchId = 0;

  const saved = store.get().games.saved;
  if (saved) {
    try {
      const c = new Chess(saved.startFen);
      for (const u of saved.moves) if (!c.move(u)) throw new Error('lance inválido');
      game = { chess: c, player: saved.player, level: saved.level, startFen: saved.startFen, over: false, showEval: !!saved.showEval };
    } catch { game = null; }
  }
  if (game) playScreen(); else setupScreen();

  function persist() {
    store.update((s) => {
      s.games.saved = game && !game.over ? { startFen: game.startFen, moves: game.chess.history.map((m) => m.uci), player: game.player, level: game.level, showEval: game.showEval } : null;
    });
  }

  function setupScreen() {
    const g = store.get().games;
    let level = g.level || 3, color = g.color || 'w';
    board.movable = null;
    board.setOrientation(color === 'b' ? 'b' : 'w');
    board.setPosition(new Chess());
    board.setArrows([]);
    const levels = h('div', { class: 'grid', style: 'grid-template-columns:1fr 1fr;gap:8px' });
    const drawLevels = () => {
      levels.innerHTML = '';
      for (const l of LEVELS) {
        levels.append(h('button', { class: 'btn' + (l.id === level ? ' primary' : ''), style: 'flex-direction:column;gap:0;padding:10px', onclick: () => { level = l.id; drawLevels(); } },
          h('span', {}, `${l.id}. ${l.name}`), h('span', { class: 'small', style: 'opacity:.75;font-weight:500' }, `~${l.elo}`)));
      }
    };
    drawLevels();
    const seg = h('div', { class: 'segmented' });
    const drawSeg = () => {
      seg.innerHTML = '';
      [['w', 'Brancas'], ['r', 'Aleatório'], ['b', 'Pretas']].forEach(([v, l]) => seg.append(h('button', { class: v === color ? 'on' : '', onclick: () => { color = v; board.setOrientation(v === 'b' ? 'b' : 'w'); drawSeg(); } }, l)));
    };
    drawSeg();
    const fenInput = h('input', { type: 'text', placeholder: 'Opcional: posição inicial em FEN', style: 'width:100%' });
    const st = g;
    side.innerHTML = '';
    side.append(h('div', { class: 'card' },
      h('h2', {}, 'Jogar contra o computador'),
      h('p', { class: 'muted' }, 'Treine sem pressão: peça dicas, volte lances e jogue no seu ritmo.'),
      h('h3', {}, 'Nível'), levels,
      h('h3', { style: 'margin-top:14px' }, 'Suas peças'), seg,
      h('details', { style: 'margin-top:14px' }, h('summary', { class: 'muted small', style: 'cursor:pointer' }, 'Começar de uma posição'), h('div', { style: 'margin-top:8px' }, fenInput)),
      h('button', { class: 'btn primary block', style: 'margin-top:16px', onclick: () => {
        let startFen = fenInput.value.trim() || new Chess().fen();
        try { new Chess(startFen); } catch { toast('FEN inválida'); return; }
        const player = color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : color;
        store.update((s) => { s.games.level = level; s.games.color = color; });
        game = { chess: new Chess(startFen), player, level, startFen, over: false, showEval: false };
        persist();
        playScreen();
      } }, 'Jogar'),
      h('div', { class: 'stats', style: 'margin-top:16px' },
        h('div', { class: 'stat' }, h('b', {}, st.won), h('span', {}, 'Vitórias')),
        h('div', { class: 'stat' }, h('b', {}, st.drawn), h('span', {}, 'Empates')),
        h('div', { class: 'stat' }, h('b', {}, st.lost), h('span', {}, 'Derrotas')),
      ),
    ));
  }

  function playScreen() {
    const c = game.chess;
    const level = LEVELS.find((l) => l.id === game.level);
    board.setOrientation(game.player);
    const statusEl = h('div', { class: 'turn' });
    const movesEl = h('div', { class: 'movelist' });
    const evalBar = h('div', { class: 'evalbar' }, h('i', { style: 'width:50%' }));
    const evalText = h('span', { class: 'small muted' });
    const evalBox = h('div', { style: game.showEval ? '' : 'display:none' }, h('div', { class: 'row small', style: 'justify-content:space-between;margin-bottom:4px' }, h('span', { class: 'muted' }, 'Avaliação'), evalText), evalBar);
    side.innerHTML = '';
    side.append(
      h('div', { class: 'card' },
        h('div', { class: 'row' }, h('div', {}, h('b', {}, `Computador · ${level.name}`), h('div', { class: 'muted small' }, `nível ${level.id} · ~${level.elo}`)), h('span', { class: 'spacer' }), h('button', { class: 'ghost small', onclick: () => board.flip() }, '⇅ Virar')),
        h('div', { style: 'margin-top:12px' }, statusEl),
        h('div', { style: 'margin-top:12px' }, evalBox),
      ),
      h('div', { class: 'card' }, h('h3', {}, 'Lances'), movesEl),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: hint }, '💡 Dica'),
        h('button', { class: 'btn', onclick: takeback }, '↶ Voltar lance'),
        h('button', { class: 'btn', onclick: () => { game.showEval = !game.showEval; evalBox.style.display = game.showEval ? '' : 'none'; persist(); if (game.showEval) refreshEval(); } }, '📊 Avaliação'),
      ),
      h('div', { class: 'row' },
        h('button', { class: 'btn', onclick: resign }, game.over ? 'Nova partida' : '🏳 Abandonar'),
        h('button', { class: 'btn', onclick: copyPgn }, 'Copiar PGN'),
      ),
    );

    function draw() {
      const last = c.history.at(-1);
      board.setPosition(c, { lastMove: last ? { from: last.from, to: last.to } : null, check: c.inCheck() ? c.kingSquare(c.turn) : null });
      board.setArrows([]);
      movesEl.innerHTML = '';
      const hist = c.history;
      let i = 0;
      if (hist.length && hist[0].color === 'b') {
        movesEl.append(h('span', { class: 'n' }, hist[0].moveNumber + '.'), h('span', { class: 'mv' }, '…'), h('span', { class: 'mv' + (hist.length === 1 ? ' last' : '') }, hist[0].san));
        i = 1;
      }
      for (; i < hist.length; i += 2) {
        movesEl.append(h('span', { class: 'n' }, hist[i].moveNumber + '.'), h('span', { class: 'mv' + (i === hist.length - 1 ? ' last' : '') }, hist[i].san), h('span', { class: 'mv' + (i + 1 === hist.length - 1 ? ' last' : '') }, hist[i + 1] ? hist[i + 1].san : ''));
      }
      movesEl.scrollTop = movesEl.scrollHeight;
      statusEl.innerHTML = '';
      const r = c.result();
      if (r.over) {
        statusEl.append(r.winner ? (r.winner === game.player ? '🏆 Você venceu' : 'Você perdeu') : '½ Empate', h('span', { class: 'muted small' }, ` · ${r.reason}`));
      } else {
        statusEl.append(h('span', { class: 'dot ' + c.turn }), c.turn === game.player ? 'Sua vez' : 'Computador pensando…');
      }
      if (game.showEval) refreshEval();
    }

    async function refreshEval() {
      const id = ++searchId;
      const fen = c.fen();
      const r = c.result();
      if (r.over) { setEval(r.winner ? (r.winner === 'w' ? MATE : -MATE) : 0, 'w', r.winner ? '#' : '0.0'); return; }
      const a = await engineAnalyse(fen, 4, 600);
      if (!alive || id !== searchId) return;
      setEval(a.score, a.turn);
    }
    function setEval(score, turn, text) {
      const w = turn === 'w' ? score : -score;
      const pct = Math.abs(w) > MATE - 1000 ? (w > 0 ? 100 : 0) : 50 + 50 * (2 / (1 + Math.exp(-w / 400)) - 1);
      evalBar.firstChild.style.width = pct + '%';
      evalText.textContent = text || scoreToText(score, turn);
    }

    async function computerTurn() {
      if (game.over || c.turn === game.player) return;
      board.movable = null;
      const id = ++searchId;
      const fen = c.fen();
      const started = Date.now();
      const res = await engineMove(fen, game.level);
      if (!alive || id !== searchId || c.fen() !== fen) return;
      const wait = Math.max(0, 350 - (Date.now() - started));
      setTimeout(() => {
        if (!alive || c.fen() !== fen) return;
        const rec = res && c.move(res.uci);
        moveSound(rec, c);
        afterMove();
      }, wait);
    }

    function afterMove() {
      draw();
      persist();
      const r = c.result();
      if (r.over) return finish(r);
      if (c.turn === game.player) board.movable = game.player;
      else computerTurn();
    }

    function finish(r) {
      game.over = true;
      board.movable = null;
      store.update((s) => {
        s.games.played++;
        if (!r.winner) s.games.drawn++;
        else if (r.winner === game.player) s.games.won++;
        else s.games.lost++;
      });
      store.logActivity();
      persist();
      const won = r.winner === game.player;
      if (won) sound.win();
      modal({
        icon: !r.winner ? '🤝' : won ? '🏆' : '♟️',
        title: !r.winner ? 'Empate' : won ? 'Você venceu!' : 'O computador venceu',
        body: `Por ${r.reason}.${won && game.level < LEVELS.length ? ' Que tal subir de nível?' : ''}`,
        actions: [{ label: 'Ver tabuleiro' }, { label: 'Nova partida', primary: true, onClick: () => { game = null; persist(); setupScreen(); } }],
      });
      playScreen();
    }

    async function hint() {
      if (game.over || c.turn !== game.player) return;
      toast('Calculando…', 900);
      const id = ++searchId;
      const a = await engineAnalyse(c.fen(), 5, 1200);
      if (!alive || id !== searchId || !a.best) return;
      board.setArrows([[a.best.slice(0, 2), a.best.slice(2, 4), 'green']]);
    }

    function takeback() {
      if (!c.history.length) return;
      searchId++;
      if (game.over) game.over = false;
      // Volta até ser a vez do jogador
      c.undo();
      while (c.history.length && c.turn !== game.player) c.undo();
      if (c.turn !== game.player) { afterMove(); return; }
      draw();
      persist();
      board.movable = game.player;
    }

    function resign() {
      if (game.over) { game = null; persist(); setupScreen(); return; }
      modal({
        title: 'Abandonar a partida?',
        body: 'Ela contará como derrota.',
        actions: [{ label: 'Continuar jogando' }, { label: 'Abandonar', primary: true, onClick: () => finish({ over: true, winner: game.player === 'w' ? 'b' : 'w', reason: 'abandono' }) }],
      });
    }

    function copyPgn() {
      const res = c.result();
      const result = res.over ? (res.winner === 'w' ? '1-0' : res.winner === 'b' ? '0-1' : '1/2-1/2') : '*';
      const tags = [`[Event "Treino Lance Certo"]`, `[White "${game.player === 'w' ? 'Você' : 'Computador ' + level.name}"]`, `[Black "${game.player === 'b' ? 'Você' : 'Computador ' + level.name}"]`, `[Result "${result}"]`];
      if (game.startFen !== new Chess().fen()) tags.push(`[SetUp "1"]`, `[FEN "${game.startFen}"]`);
      const pgn = tags.join('\n') + '\n\n' + c.pgnMoves() + ' ' + result;
      navigator.clipboard?.writeText(pgn).then(() => toast('PGN copiado!'), () => toast('Não foi possível copiar'));
    }

    board.opts.dests = (sq) => c.moves({ square: sq }).map((m) => m.toSq);
    board.opts.onMove = (from, to, promotion) => {
      if (game.over || c.turn !== game.player) return;
      const rec = c.move({ from, to, promotion });
      if (!rec) return;
      moveSound(rec, c);
      afterMove();
    };
    draw();
    if (game.over) board.movable = null;
    else if (c.turn === game.player) board.movable = game.player;
    else computerTurn();
  }

  return () => { alive = false; searchId++; board.destroy(); };
}
