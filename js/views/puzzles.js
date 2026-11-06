// Problemas táticos com rating, e o modo Contra o relógio.
import { Chess, colorOf } from '../chess.js';
import { Board } from '../board.js';
import { PUZZLES } from '../data/puzzles.js';
import { h, md, sound, moveSound, modal, sparkline } from '../ui.js';
import * as store from '../store.js';

export const THEMES = {
  mateEm1: 'Mate em 1',
  mateEm2: 'Mate em 2',
  mateEm3: 'Mate em 3',
  vantagem: 'Ganho de material',
  garfo: 'Garfo',
  promocao: 'Promoção',
  captura: 'Captura',
  xeque: 'Xeque',
};

export function pickPuzzle(rating, { theme = 'all', exclude = new Set(), rng = Math.random } = {}) {
  let pool = PUZZLES.filter((p) => !exclude.has(p.id) && (theme === 'all' || p.themes.includes(theme)));
  if (!pool.length) pool = PUZZLES.filter((p) => theme === 'all' || p.themes.includes(theme));
  if (!pool.length) return null;
  const near = pool.slice().sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, 12);
  return near[Math.floor(rng() * near.length)];
}

// Controla a resolução de um problema no tabuleiro
export class PuzzleRunner {
  constructor(board, puzzle, { onSolved = () => {}, onWrong = () => {}, onProgress = () => {}, retry = true } = {}) {
    this.board = board;
    this.p = puzzle;
    this.cb = { onSolved, onWrong, onProgress };
    this.retry = retry;
    this.chess = new Chess(puzzle.fen);
    this.player = this.chess.turn === 'w' ? 'b' : 'w';
    this.ply = 0;
    this.failed = false;
    this.done = false;
    this.timers = [];
    this.hintLevel = 0;
  }

  later(fn, ms) { this.timers.push(setTimeout(fn, ms)); }
  stop() { this.timers.forEach(clearTimeout); this.timers = []; this.done = true; this.board.movable = null; }

  update(rec) {
    const c = this.chess;
    this.board.setPosition(c, { lastMove: rec ? { from: rec.from, to: rec.to } : null, check: c.inCheck() ? c.kingSquare(c.turn) : null });
  }

  start() {
    const b = this.board;
    b.setArrows([]);
    b.setMarks('hint', []);
    b.setOrientation(this.player);
    b.movable = null;
    this.update(null);
    b.opts.dests = (sq) => this.chess.moves({ square: sq }).map((m) => m.toSq);
    b.opts.onMove = (from, to, promotion) => this.onMove(from, to, promotion);
    this.later(() => {
      const r = this.chess.move(this.p.pre);
      this.update(r);
      moveSound(r, this.chess);
      b.movable = this.player;
    }, 500);
  }

  expected() { return this.p.moves[this.ply]; }

  onMove(from, to, promotion) {
    if (this.done) return;
    const c = this.chess;
    const rec = c.move({ from, to, promotion });
    if (!rec) return;
    this.update(rec);
    moveSound(rec, c);
    this.board.setMarks('hint', []);
    this.board.setArrows([]);
    const isLast = this.ply === this.p.moves.length - 1;
    const isMate = this.p.themes.some((t) => t.startsWith('mateEm'));
    const exp = this.expected();
    const ok = rec.uci === exp || (exp.length === 5 && rec.uci.slice(0, 4) === exp.slice(0, 4) && rec.promotion === 'q' && exp[4] === 'q') || (isLast && isMate && c.isCheckmate());
    if (!ok) {
      sound.bad();
      this.board.flash(rec.to, 'bad', 700);
      const first = !this.failed;
      this.failed = true;
      this.board.movable = null;
      this.cb.onWrong(first, rec);
      if (this.retry) this.later(() => { c.undo(); this.update(c.history.at(-1)); this.board.movable = this.player; }, 800);
      else this.done = true;
      return;
    }
    this.ply++;
    if (this.ply >= this.p.moves.length) {
      this.done = true;
      this.board.movable = null;
      this.board.flash(rec.to, 'good', 900);
      sound.good();
      this.cb.onSolved(!this.failed);
      return;
    }
    this.cb.onProgress();
    this.board.movable = null;
    this.later(() => {
      const r = c.move(this.p.moves[this.ply]);
      this.update(r);
      moveSound(r, c);
      this.ply++;
      this.board.movable = this.player;
    }, 450);
  }

  hint() {
    if (this.done) return;
    const u = this.expected();
    this.hintLevel++;
    this.failed = true; // usar dica conta como não resolvido de primeira
    if (this.hintLevel === 1) this.board.setMarks('hint', [u.slice(0, 2)]);
    else this.board.setArrows([[u.slice(0, 2), u.slice(2, 4), 'green']]);
  }

  showSolution(onEnd) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.failed = true;
    this.done = true;
    this.board.movable = null;
    const c = this.chess;
    // Volta ao ponto atual do problema (descarta tentativa errada pendente)
    const playNext = () => {
      if (this.ply >= this.p.moves.length) { onEnd && onEnd(); return; }
      const r = c.move(this.p.moves[this.ply]);
      if (!r) { onEnd && onEnd(); return; }
      this.update(r);
      moveSound(r, c);
      this.board.setArrows([[r.fromSq, r.toSq, colorOf(r.piece) === this.player ? 'green' : 'blue']]);
      this.ply++;
      this.timers.push(setTimeout(playNext, 900));
    };
    // Se a última jogada do aluno foi errada e ainda não desfeita
    const expectedColor = this.ply % 2 === 0 ? this.player : null;
    if (expectedColor && c.turn !== this.player) { c.undo(); this.update(c.history.at(-1)); }
    this.timers.push(setTimeout(playNext, 300));
  }
}

function eloDelta(userRating, puzzleRating, win, games) {
  const k = games < 20 ? 40 : games < 80 ? 24 : 16;
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
  return Math.round(k * ((win ? 1 : 0) - expected));
}

export function puzzlesView(root) {
  const boardWrap = h('div', { class: 'board-wrap' });
  const board = new Board(boardWrap, {});
  let theme = 'all';
  let runner = null;
  let current = null;
  let recorded = false;

  const ratingEl = h('b');
  const deltaEl = h('span', { class: 'chip' });
  const streakEl = h('b');
  const turnEl = h('div', { class: 'turn' });
  const infoEl = h('div', { class: 'muted small' });
  const feedbackEl = h('div', { class: 'feedback' });
  const actionsEl = h('div', { class: 'row' });
  const resultsEl = h('div', { class: 'results' });
  const sparkEl = h('div');
  const themeSel = h('select', { 'aria-label': 'Tema', onchange: (e) => { theme = e.target.value; loadNext(); } },
    h('option', { value: 'all' }, 'Todos os temas'),
    Object.entries(THEMES).filter(([k]) => PUZZLES.some((p) => p.themes.includes(k))).map(([k, v]) => h('option', { value: k }, `${v} (${PUZZLES.filter((p) => p.themes.includes(k)).length})`)),
  );
  const recent = [];

  const panel = h('div', { class: 'panel' },
    h('div', { class: 'card' },
      h('div', { class: 'row' }, h('h2', { style: 'margin:0' }, 'Problemas'), h('span', { class: 'spacer' }), themeSel),
      h('div', { class: 'stats', style: 'margin-top:12px' },
        h('div', { class: 'stat' }, h('div', { class: 'row', style: 'gap:8px' }, ratingEl, deltaEl), h('span', {}, 'Seu rating')),
        h('div', { class: 'stat' }, streakEl, h('span', {}, 'Sequência')),
      ),
      h('div', { style: 'margin-top:10px' }, sparkEl),
    ),
    h('div', { class: 'card' }, turnEl, h('div', { style: 'margin-top:6px' }, infoEl), h('div', { style: 'margin-top:10px' }, resultsEl)),
    feedbackEl,
    actionsEl,
  );
  root.append(h('div', { class: 'play' }, boardWrap, panel));

  function refreshStats(delta) {
    const s = store.get().puzzle;
    ratingEl.textContent = s.rating;
    streakEl.textContent = s.streak;
    if (delta == null) deltaEl.style.display = 'none';
    else {
      deltaEl.style.display = '';
      deltaEl.textContent = (delta >= 0 ? '+' : '') + delta;
      deltaEl.className = 'chip ' + (delta >= 0 ? 'good' : 'bad');
    }
    sparkEl.innerHTML = '';
    sparkEl.append(sparkline(s.ratingLog.slice(-40)));
    resultsEl.innerHTML = '';
    recent.slice(-24).forEach((ok) => resultsEl.append(h('i', { class: ok ? 'ok' : 'ko', title: ok ? 'Resolvido' : 'Errado' })));
  }

  function feedback(text, kind) {
    feedbackEl.className = 'feedback show ' + kind;
    feedbackEl.innerHTML = md(text);
  }

  function record(win) {
    if (recorded) return null;
    recorded = true;
    let delta = 0;
    store.update((s) => {
      const st = s.puzzle;
      const games = st.solved + st.failed;
      delta = eloDelta(st.rating, current.rating, win, games);
      st.rating = Math.max(100, st.rating + delta);
      if (win) { st.solved++; st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); }
      else { st.failed++; st.streak = 0; }
      st.history[current.id] = win ? 1 : 0;
      st.ratingLog.push(st.rating);
      if (st.ratingLog.length > 200) st.ratingLog.shift();
    });
    store.logActivity();
    recent.push(win);
    refreshStats(delta);
    return delta;
  }

  function setActions(list) {
    actionsEl.innerHTML = '';
    for (const a of list) actionsEl.append(h('button', { class: 'btn ' + (a.kind || ''), onclick: a.onClick }, a.label));
  }

  function afterEnd() {
    infoEl.innerHTML = `Problema <b>${current.id}</b> · rating ${current.rating} · ${current.themes.map((t) => THEMES[t] || t).join(', ')}`;
    setActions([
      { label: 'Próximo problema →', kind: 'primary', onClick: loadNext },
      { label: '↺ Tentar de novo', onClick: () => load(current, true) },
    ]);
  }

  function load(p, again = false) {
    if (runner) runner.stop();
    current = p;
    recorded = again; // repetir não altera o rating
    feedbackEl.className = 'feedback';
    if (!p) { feedback('Nenhum problema disponível.', 'bad'); return; }
    runner = new PuzzleRunner(board, p, {
      onWrong: () => {
        const d = record(false);
        feedback(`Não é esse lance.${d != null ? ` (${d})` : ''} Tente outra vez ou veja a solução.`, 'bad');
      },
      onProgress: () => feedback('Isso! Continue…', 'info'),
      onSolved: (clean) => {
        const d = record(clean);
        feedback(clean ? `✓ Resolvido!${d != null ? ` (+${d})` : ''}` : '✓ Resolvido (não conta como acerto de primeira).', 'good');
        afterEnd();
      },
    });
    const color = runner.player === 'w' ? 'brancas' : 'pretas';
    turnEl.innerHTML = '';
    turnEl.append(h('span', { class: 'dot ' + runner.player }), `Jogam as ${color}: encontre o melhor lance`);
    const mate = p.themes.find((t) => t.startsWith('mateEm'));
    infoEl.textContent = mate && !again ? `Objetivo: ${THEMES[mate].toLowerCase()}.` : 'Objetivo: ganhar vantagem decisiva.';
    setActions([
      { label: '💡 Dica', onClick: () => { runner.hint(); if (!recorded) { record(false); feedback('Dica usada: este problema não conta como acerto.', 'info'); } } },
      { label: 'Ver solução', onClick: () => { if (!recorded) record(false); runner.showSolution(() => { feedback('Esta era a solução.', 'info'); afterEnd(); }); } },
      { label: 'Pular →', onClick: () => { if (!recorded && runner.ply > 0) record(false); loadNext(); } },
    ]);
    runner.start();
    refreshStats(null);
  }

  function loadNext() {
    const s = store.get().puzzle;
    const exclude = new Set(Object.keys(s.history));
    load(pickPuzzle(s.rating, { theme, exclude }));
  }

  loadNext();
  return () => { if (runner) runner.stop(); board.destroy(); };
}

// ---------------- Contra o relógio ----------------
export function rushView(root) {
  const boardWrap = h('div', { class: 'board-wrap' });
  const board = new Board(boardWrap, {});
  const side = h('div', { class: 'panel' });
  root.append(h('div', { class: 'play' }, boardWrap, side));
  let runner = null, timerId = null, alive = true;

  function intro() {
    if (runner) runner.stop();
    clearInterval(timerId);
    board.setPosition(new Chess());
    board.movable = null;
    const best = store.get().rush;
    let mode = 180;
    const seg = h('div', { class: 'segmented' });
    const modes = [[180, '3 minutos'], [300, '5 minutos'], [0, 'Sobrevivência']];
    const draw = () => {
      seg.innerHTML = '';
      modes.forEach(([v, l]) => seg.append(h('button', { class: v === mode ? 'on' : '', onclick: () => { mode = v; draw(); } }, l)));
    };
    draw();
    side.innerHTML = '';
    side.append(h('div', { class: 'card' },
      h('h2', {}, 'Contra o relógio'),
      h('p', { class: 'muted' }, 'Resolva o máximo de problemas que conseguir. Eles começam fáceis e ficam cada vez mais difíceis. Três erros e acabou!'),
      seg,
      h('div', { class: 'stats', style: 'margin:16px 0' },
        h('div', { class: 'stat' }, h('b', {}, best.best || 0), h('span', {}, 'Recorde')),
        h('div', { class: 'stat' }, h('b', {}, best.runs || 0), h('span', {}, 'Tentativas')),
      ),
      h('button', { class: 'btn primary block', onclick: () => run(mode) }, 'Começar'),
    ));
  }

  function run(seconds) {
    let score = 0, strikes = 0, level = 0, left = seconds;
    const used = new Set();
    const timerEl = h('div', { class: 'timer' });
    const scoreEl = h('div', { class: 'timer' }, '0');
    const strikesEl = h('div', { class: 'strikes' });
    const turnEl = h('div', { class: 'turn' });
    const results = h('div', { class: 'results' });
    side.innerHTML = '';
    side.append(
      h('div', { class: 'card' },
        h('div', { class: 'row' },
          h('div', { class: 'stat' }, scoreEl, h('span', {}, 'Acertos')),
          h('span', { class: 'spacer' }),
          seconds ? h('div', { class: 'stat', style: 'text-align:right' }, timerEl, h('span', {}, 'Tempo')) : null,
        ),
        h('div', { class: 'row', style: 'margin-top:10px' }, strikesEl),
      ),
      h('div', { class: 'card' }, turnEl, h('div', { style: 'margin-top:10px' }, results)),
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => end('Você encerrou a rodada.') }, 'Encerrar')),
    );
    const drawStrikes = () => { strikesEl.innerHTML = ''; for (let i = 0; i < 3; i++) strikesEl.append(h('i', { class: i < strikes ? 'x' : '' })); };
    const drawTime = () => { const m = Math.floor(left / 60), s = left % 60; timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`; timerEl.classList.toggle('low', left <= 15); };
    drawStrikes();
    if (seconds) {
      drawTime();
      timerId = setInterval(() => {
        left--;
        drawTime();
        if (left <= 10 && left > 0) sound.tick();
        if (left <= 0) end('O tempo acabou!');
      }, 1000);
    }

    const nextPuzzle = () => {
      if (!alive) return;
      const target = 450 + level * 70;
      const p = pickPuzzle(target, { exclude: used });
      used.add(p.id);
      level++;
      runner = new PuzzleRunner(board, p, {
        retry: false,
        onWrong: () => {
          strikes++;
          drawStrikes();
          results.append(h('i', { class: 'ko' }));
          if (strikes >= 3) setTimeout(() => end('Três erros.'), 700);
          else setTimeout(nextPuzzle, 700);
        },
        onSolved: () => {
          score++;
          scoreEl.textContent = score;
          results.append(h('i', { class: 'ok' }));
          setTimeout(nextPuzzle, 450);
        },
      });
      turnEl.innerHTML = '';
      turnEl.append(h('span', { class: 'dot ' + runner.player }), `Jogam as ${runner.player === 'w' ? 'brancas' : 'pretas'}`);
      runner.start();
    };

    let ended = false;
    function end(reason) {
      if (ended) return;
      ended = true;
      clearInterval(timerId);
      if (runner) runner.stop();
      const prev = store.get().rush.best || 0;
      store.update((s) => { s.rush.runs++; s.rush.best = Math.max(prev, score); });
      store.logActivity();
      if (score > prev) sound.win();
      modal({
        icon: score > prev ? '🏆' : '⏱️',
        title: `${score} acerto${score === 1 ? '' : 's'}`,
        body: `${reason} ${score > prev ? '**Novo recorde!**' : `Recorde: **${prev}**.`}`,
        actions: [{ label: 'Menu', onClick: intro }, { label: 'Jogar de novo', primary: true, onClick: () => run(seconds) }],
      });
    }
    nextPuzzle();
  }

  intro();
  return () => { alive = false; clearInterval(timerId); if (runner) runner.stop(); board.destroy(); };
}
