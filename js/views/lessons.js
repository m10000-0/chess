// Lista de cursos e reprodutor de aulas interativas.
import { Chess, colorOf } from '../chess.js';
import { Board } from '../board.js';
import { COURSES, ALL_LESSONS } from '../data/lessons.js';
import { engineMove } from '../engine-client.js';
import { h, md, sound, moveSound, modal } from '../ui.js';
import * as store from '../store.js';

export function nextLesson() {
  const done = store.get().lessons;
  return ALL_LESSONS.find((l) => !done[l.id]) || null;
}

export function coursesView(root) {
  const done = store.get().lessons;
  const total = ALL_LESSONS.length, completed = ALL_LESSONS.filter((l) => done[l.id]).length;
  const page = h('div', { class: 'page' },
    h('div', { class: 'page-head' },
      h('h1', {}, 'Aulas'),
      h('p', {}, 'Cursos curtos e interativos: leia, veja no tabuleiro e pratique. Seu progresso fica salvo neste navegador.'),
      h('div', { class: 'row' }, h('div', { class: 'progress', style: 'flex:1;max-width:360px' }, h('i', { style: `width:${(completed / total) * 100}%` })), h('span', { class: 'muted small' }, `${completed} de ${total} aulas concluídas`)),
    ),
    COURSES.map((c) => {
      const n = c.lessons.filter((l) => done[l.id]).length;
      return h('section', { class: 'course' },
        h('div', { class: 'course-head' },
          h('div', { class: 'icon' }, c.icon),
          h('div', {}, h('h2', { style: 'margin:0' }, c.title), h('div', { class: 'muted small' }, `${c.level} · ${n}/${c.lessons.length} · ${c.description}`)),
        ),
        h('div', { class: 'grid cols-2' },
          c.lessons.map((l, i) => h('a', { class: 'card lesson-card' + (done[l.id] ? ' done' : ''), href: `#/aula/${c.id}/${l.id}` },
            h('div', { class: 'num' }, done[l.id] ? '✓' : i + 1),
            h('div', {}, h('div', { class: 't' }, l.title), h('div', { class: 's' }, l.summary)),
          )),
        ),
      );
    }),
  );
  root.append(page);
}

export function lessonView(root, [courseId, lessonId]) {
  const course = COURSES.find((c) => c.id === courseId);
  const lesson = course?.lessons.find((l) => l.id === lessonId);
  if (!lesson) { root.append(h('div', { class: 'page' }, h('h1', {}, 'Aula não encontrada'), h('a', { class: 'btn', href: '#/aulas' }, 'Voltar às aulas'))); return; }

  let stepIdx = 0;
  let alive = true;
  let timers = [];
  const later = (fn, ms) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const boardWrap = h('div', { class: 'board-wrap' });
  const board = new Board(boardWrap, {});
  const crumbs = h('div', { class: 'row small' }, h('a', { href: '#/aulas', class: 'muted' }, '← ' + course.title));
  const titleEl = h('h2', { style: 'margin:4px 0 0' }, lesson.title);
  const stepsEl = h('div', { class: 'steps' });
  const promptEl = h('div', { class: 'prompt' });
  const extraEl = h('div');
  const feedbackEl = h('div', { class: 'feedback' });
  const actionsEl = h('div', { class: 'row' });
  const panel = h('div', { class: 'panel' },
    h('div', { class: 'card' }, crumbs, titleEl, h('div', { style: 'margin:10px 0 14px' }, stepsEl), promptEl, extraEl),
    feedbackEl,
    actionsEl,
  );
  root.append(h('div', { class: 'play' }, boardWrap, panel));

  function feedback(text, kind = 'info') {
    feedbackEl.className = 'feedback show ' + kind;
    feedbackEl.innerHTML = md(text);
  }
  function clearFeedback() { feedbackEl.className = 'feedback'; feedbackEl.textContent = ''; }

  function setActions(list) {
    actionsEl.innerHTML = '';
    for (const a of list) actionsEl.append(h('button', { class: 'btn ' + (a.kind || ''), onclick: a.onClick, disabled: a.disabled }, a.label));
  }

  function renderSteps() {
    stepsEl.innerHTML = '';
    lesson.steps.forEach((_, i) => stepsEl.append(h('i', { class: i < stepIdx ? 'done' : i === stepIdx ? 'cur' : '' })));
  }

  function resetBoard() {
    clearTimers();
    board.opts.onSquareClick = null;
    board.movable = null;
    board.setArrows([]);
    for (const k of ['highlight', 'star', 'hint', 'good', 'bad', 'target']) board.setMarks(k, []);
    board.root.classList.remove('find-board');
  }

  function complete(msg) {
    sound.good();
    feedback('✓ ' + (msg || 'Muito bem!'), 'good');
    board.movable = null;
    const last = stepIdx === lesson.steps.length - 1;
    setActions([{ label: last ? 'Concluir aula' : 'Continuar →', kind: 'primary', onClick: next }]);
  }

  function next() {
    if (stepIdx < lesson.steps.length - 1) { stepIdx++; showStep(); return; }
    finishLesson();
  }

  function finishLesson() {
    store.update((s) => { s.lessons[lesson.id] = { done: true, at: Date.now() }; });
    store.logActivity();
    sound.win();
    renderSteps();
    stepsEl.querySelectorAll('i').forEach((i) => (i.className = 'done'));
    const idx = ALL_LESSONS.findIndex((l) => l.id === lesson.id);
    const nxt = ALL_LESSONS.slice(idx + 1).find(Boolean);
    modal({
      icon: '🏆',
      title: 'Aula concluída!',
      body: `Você terminou **${lesson.title}**.`,
      actions: [
        { label: 'Lista de aulas', onClick: () => (location.hash = '#/aulas') },
        nxt ? { label: 'Próxima aula →', primary: true, onClick: () => (location.hash = `#/aula/${nxt.course}/${nxt.id}`) } : { label: 'Resolver problemas', primary: true, onClick: () => (location.hash = '#/problemas') },
      ],
    });
  }

  function showStep() {
    const step = lesson.steps[stepIdx];
    resetBoard();
    clearFeedback();
    renderSteps();
    promptEl.innerHTML = md(step.text);
    extraEl.innerHTML = '';
    const handlers = { info: stepInfo, find: stepFind, stars: stepStars, move: stepMove, play: stepPlay };
    handlers[step.type](step);
  }

  // ---- info ----
  function stepInfo(step) {
    const c = new Chess(step.fen || '8/8/8/8/8/8/8/8 w - - 0 1');
    board.setOrientation('w');
    board.setPosition(c);
    board.setMarks('highlight', step.highlight || []);
    board.setArrows(step.arrows || []);
    setActions([
      stepIdx > 0 ? { label: '← Voltar', onClick: () => { stepIdx--; showStep(); } } : null,
      { label: stepIdx === lesson.steps.length - 1 ? 'Concluir aula' : 'Continuar →', kind: 'primary', onClick: next },
    ].filter(Boolean));
  }

  // ---- find ----
  function stepFind(step) {
    const c = new Chess('8/8/8/8/8/8/8/8 w - - 0 1');
    board.setOrientation('w');
    board.setPosition(c);
    let i = 0, errors = 0;
    const target = h('div', { class: 'big-target' });
    extraEl.append(h('div', { class: 'muted small', style: 'text-align:center;margin-top:8px' }, 'Clique na casa'), target);
    const show = () => { target.textContent = step.targets[i]; };
    show();
    board.opts.onSquareClick = (sq) => {
      if (sq === step.targets[i]) {
        board.flash(sq, 'good', 500);
        sound.move();
        i++;
        if (i >= step.targets.length) { board.opts.onSquareClick = null; target.textContent = '✓'; complete(errors ? `Concluído com ${errors} erro(s).` : 'Perfeito! Você já sabe ler o tabuleiro.'); }
        else show();
      } else {
        errors++;
        board.flash(sq, 'bad', 500);
        sound.bad();
        feedback(`Essa é a casa **${sq}**. Procure a **${step.targets[i]}**.`, 'bad');
      }
    };
    setActions([]);
  }

  // ---- stars ----
  function stepStars(step) {
    const c = new Chess(step.fen);
    const me = c.turn;
    board.setOrientation(me);
    const captureMode = !step.targets;
    let remaining = captureMode ? [] : step.targets.slice();
    let moves = 0;
    const counter = h('div', { class: 'muted small' });
    extraEl.append(counter);
    const enemies = () => c.board.map((p, i) => (p && colorOf(p) !== me ? i : -1)).filter((i) => i >= 0);
    const refresh = () => {
      board.setPosition(c, { lastMove: c.history.length ? { from: c.history.at(-1).from, to: c.history.at(-1).to } : null });
      if (!captureMode) board.setMarks('star', remaining);
      const left = captureMode ? enemies().length : remaining.length;
      counter.textContent = `Lances: ${moves} · ${captureMode ? 'Peças restantes' : 'Estrelas restantes'}: ${left}`;
      return left;
    };
    const restart = () => showStep();
    board.movable = me;
    board.opts.dests = (sq) => { c.turn = me; c.ep = -1; return c.moves({ square: sq }).map((m) => m.toSq); };
    board.opts.onMove = (from, to, promotion) => {
      c.turn = me; c.ep = -1;
      const rec = c.move({ from, to, promotion });
      if (!rec) return;
      c.turn = me;
      moves++;
      if (rec.captured) sound.capture(); else sound.move();
      remaining = remaining.filter((t) => t !== to);
      if (refresh() === 0) complete(`Concluído em ${moves} lances!`);
    };
    refresh();
    setActions([{ label: '↺ Recomeçar', onClick: restart }]);
  }

  // ---- move ----
  function stepMove(step) {
    const c = new Chess(step.fen);
    let ply = 0, errors = 0, hintLevel = 0;
    const player = step.pre ? (c.turn === 'w' ? 'b' : 'w') : c.turn;
    board.setOrientation(player);
    board.setPosition(c, { check: c.inCheck() ? c.kingSquare(c.turn) : null });
    const update = (rec) => board.setPosition(c, { lastMove: rec ? { from: rec.from, to: rec.to } : null, check: c.inCheck() ? c.kingSquare(c.turn) : null });
    const expected = () => step.moves[ply].split('|').map((s) => s.trim());
    const start = () => { board.movable = player; };
    board.opts.dests = (sq) => c.moves({ square: sq }).map((m) => m.toSq);
    board.opts.onMove = (from, to, promotion) => {
      const rec = c.move({ from, to, promotion });
      if (!rec) return;
      update(rec);
      moveSound(rec, c);
      board.setMarks('hint', []);
      board.setArrows([]);
      const isLast = ply === step.moves.length - 1;
      const ok = expected().includes(rec.uci) || expected().includes(rec.uci.slice(0, 4)) || (step.goal === 'mate' && isLast && c.isCheckmate());
      if (!ok) {
        errors++;
        board.movable = null;
        sound.bad();
        let msg = step.wrong?.[rec.uci] || (c.isStalemate() ? 'Afogamento! O adversário não tem lances e não está em xeque: isso é **empate**.' : c.isCheckmate() ? 'Isso é mate, mas não o que buscamos aqui.' : 'Não é esse. Tente de novo!');
        feedback(msg, 'bad');
        later(() => { c.undo(); update(c.history.at(-1)); start(); }, 900);
        return;
      }
      ply++;
      if (ply >= step.moves.length) { complete(step.success); return; }
      board.movable = null;
      feedback('Boa! Continue…', 'info');
      later(() => {
        const reply = c.move(step.moves[ply].split('|')[0].trim());
        update(reply);
        moveSound(reply, c);
        ply++;
        start();
      }, 550);
    };
    const hint = () => {
      const u = expected()[0];
      hintLevel++;
      if (hintLevel === 1) board.setMarks('hint', [u.slice(0, 2)]);
      else board.setArrows([[u.slice(0, 2), u.slice(2, 4), 'green']]);
    };
    const restart = () => showStep();
    if (step.pre) {
      board.movable = null;
      later(() => { const r = c.move(step.pre); update(r); moveSound(r, c); start(); }, 600);
    } else start();
    setActions([
      { label: '💡 Dica', onClick: hint },
      { label: '↺ Recomeçar', onClick: restart },
    ]);
  }

  // ---- play ----
  function stepPlay(step) {
    const c = new Chess(step.fen);
    const player = c.turn;
    let thinking = false;
    let token = {};
    const myToken = token;
    board.setOrientation(player);
    const update = (rec) => board.setPosition(c, { lastMove: rec ? { from: rec.from, to: rec.to } : null, check: c.inCheck() ? c.kingSquare(c.turn) : null });
    update(null);
    const status = h('div', { class: 'muted small' }, 'Você joga de ' + (player === 'w' ? 'brancas' : 'pretas') + '.');
    extraEl.append(status);
    const fail = (msg) => {
      board.movable = null;
      sound.bad();
      feedback(msg + ' Tente de novo.', 'bad');
      setActions([{ label: '↺ Tentar de novo', kind: 'primary', onClick: () => { token = null; showStep(); } }]);
    };
    const checkGoal = (rec) => {
      if (step.goal === 'mate' && c.isCheckmate() && c.turn !== player) { complete(step.success); return true; }
      if (step.goal === 'promote' && rec && rec.promotion && colorOf(rec.piece) === player) {
        const canTake = c.legalMoves().some((m) => m.to === rec.to);
        if (canTake) { fail('A nova dama pode ser capturada!'); return true; }
        complete(step.success);
        return true;
      }
      const r = c.result();
      if (r.over) { fail(r.reason === 'afogamento' ? 'Afogamento: empate!' : `Fim de jogo (${r.reason}).`); return true; }
      if (step.goal === 'promote' && !c.board.some((p) => p && p.toLowerCase() === 'p' && colorOf(p) === player)) { fail('O peão foi perdido.'); return true; }
      if (c.history.length > 120) { fail('Lances demais.'); return true; }
      return false;
    };
    board.opts.dests = (sq) => c.moves({ square: sq }).map((m) => m.toSq);
    board.opts.onMove = async (from, to, promotion) => {
      if (thinking) return;
      const rec = c.move({ from, to, promotion });
      if (!rec) return;
      update(rec);
      moveSound(rec, c);
      if (checkGoal(rec)) return;
      thinking = true;
      board.movable = null;
      status.textContent = 'O computador está pensando…';
      const res = await engineMove(c.fen(), 5);
      if (!alive || token !== myToken) return;
      thinking = false;
      const reply = res && c.move(res.uci);
      update(reply);
      moveSound(reply, c);
      status.textContent = 'Sua vez.';
      if (checkGoal(reply)) return;
      board.movable = player;
    };
    board.movable = player;
    setActions([{ label: '↺ Recomeçar', onClick: () => { token = null; showStep(); } }]);
  }

  showStep();

  return () => { alive = false; clearTimers(); board.destroy(); };
}

