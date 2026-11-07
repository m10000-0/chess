// Tela de revisão: busca a partida, roda o motor em cada posição, classifica os lances e mostra tudo.
import { Chess, START_FEN } from './lib/chess.js';
import { Board } from './lib/board.js';
import { parsePgn } from './pgn.js';
import { identifyOpening } from './openings.js';
import { CLASSES, CLASS_ORDER, classify, summarize, scoreText, whiteWin } from './analysis.js';
import { StockfishEngine, BuiltinEngine } from './engines.js';

const app = document.getElementById('app');
const inFrame = window.top !== window;
let info = {};
try { info = JSON.parse(decodeURIComponent(location.hash.slice(1)) || '{}'); } catch { info = {}; }

// ---------- utilidades ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
let toastTimer;
function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}
const badge = (cls, small = false) => h('span', { class: 'badge' + (small ? ' small' : ''), style: `background:${CLASSES[cls].color}`, title: CLASSES[cls].label }, CLASSES[cls].sym);

const DEFAULTS = { username: '', depth: 14, engine: 'stockfish' };
const storage = {
  async get() {
    try {
      if (globalThis.chrome?.storage?.local) return { ...DEFAULTS, ...(await chrome.storage.local.get(Object.keys(DEFAULTS))) };
    } catch { /* fora da extensão */ }
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('lc-review') || '{}') }; } catch { return { ...DEFAULTS }; }
  },
  async set(obj) {
    try { if (globalThis.chrome?.storage?.local) { await chrome.storage.local.set(obj); return; } } catch { /* fora da extensão */ }
    try { localStorage.setItem('lc-review', JSON.stringify({ ...(await this.get()), ...obj })); } catch { /* sem armazenamento */ }
  },
};

function close() {
  if (inFrame) window.parent.postMessage({ type: 'lc-close' }, '*');
  else window.close();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

function topbar(gameText = '') {
  return h('div', { class: 'topbar' },
    h('span', { class: 'brand-mark' }, '♞'),
    h('span', { class: 'title' }, 'Revisão Lance Certo'),
    h('span', { class: 'game' }, gameText),
    inFrame ? h('button', { class: 'close', title: 'Fechar (Esc)', onclick: close }, '×') : null,
  );
}

// ---------- busca da partida (API pública do chess.com) ----------
async function fetchJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function findGame({ id, users = [] }, savedUser) {
  const saved = (savedUser || '').trim().toLowerCase();
  const candidates = [...new Set([saved, ...users].filter(Boolean))];
  for (const u of candidates) {
    let archives;
    try { archives = (await fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`)).archives || []; } catch { continue; }
    for (const a of archives.slice(-2).reverse()) {
      let games;
      try { games = (await fetchJson(a)).games || []; } catch { continue; }
      if (id) {
        const g = games.find((x) => String(x.url || '').endsWith('/' + id));
        if (g) return g;
      } else if (u === saved && games.length) {
        return games.slice().sort((x, y) => (y.end_time || 0) - (x.end_time || 0))[0];
      }
    }
  }
  return null;
}

// ---------- telas ----------
function loadingScreen(text) {
  app.innerHTML = '';
  app.append(topbar(), h('div', { class: 'center', style: 'text-align:center' }, h('div', { class: 'spinner' }), h('div', { class: 'muted' }, text)));
}

async function formScreen(message) {
  const s = await storage.get();
  app.innerHTML = '';
  const user = h('input', { type: 'text', placeholder: 'seu usuário no chess.com', value: s.username, style: 'width:100%' });
  const pgn = h('textarea', { placeholder: '[Event "Live Chess"]\n...\n1. e4 e5 2. Nf3 ...' });
  app.append(topbar(), h('div', { class: 'center' },
    h('div', { class: 'card' },
      h('h2', {}, 'Qual partida vamos revisar?'),
      message ? h('p', { class: 'muted' }, message) : null,
      h('label', {}, 'Usuário do chess.com'),
      h('div', { class: 'row' }, user, h('button', { class: 'btn primary', onclick: async () => {
        const u = user.value.trim();
        if (!u) { toast('Digite um usuário.'); return; }
        await storage.set({ username: u });
        loadingScreen('Buscando a partida…');
        const g = await findGame({ id: info.id, users: info.users }, u).catch(() => null);
        if (g) startFromApi(g); else formScreen(info.id ? 'Não encontrei esta partida no histórico público desse usuário. Se ela acabou agora, aguarde alguns minutos ou cole o PGN abaixo.' : 'Não encontrei partidas recentes para esse usuário.');
      } }, info.id ? 'Buscar esta partida' : 'Revisar minha última partida')),
      h('label', {}, 'Ou cole o PGN'),
      pgn,
      h('p', { class: 'muted small' }, 'No chess.com: Compartilhar → PGN → Copiar.'),
      h('button', { class: 'btn primary block', onclick: () => {
        if (!pgn.value.trim()) { toast('Cole um PGN.'); return; }
        start(pgn.value, {});
      } }, 'Analisar PGN'),
    ),
  ));
}

function startFromApi(g) {
  if (g.rules && g.rules !== 'chess') { formScreen('A revisão só funciona com xadrez clássico (sem variantes).'); return; }
  start(g.pgn, { white: g.white, black: g.black, url: g.url });
}

// ---------- revisão ----------
let current = null; // controla a análise em andamento

async function start(pgnText, meta) {
  if (current) current.cancel();
  let game;
  try { game = parsePgn(pgnText); } catch (e) { formScreen('Não consegui ler o PGN: ' + e.message); return; }
  const { headers } = game;
  if (!headers.Result || headers.Result === '*' || !/(1-0|0-1|1\/2-1\/2)\s*$/.test(pgnText.trim())) {
    formScreen('Esta partida ainda não terminou. A revisão só fica disponível depois do fim da partida.');
    return;
  }
  if (!game.moves.length) { formScreen('A partida não tem lances para analisar.'); return; }
  const s = await storage.get();
  const review = new Review(game, meta, s);
  current = review;
  review.run();
}

class Review {
  constructor(game, meta, settings) {
    this.game = game;
    this.settings = settings;
    this.cancelled = false;
    const h0 = game.headers;
    this.white = { name: meta.white?.username || h0.White || 'Brancas', elo: meta.white?.rating || h0.WhiteElo || '' };
    this.black = { name: meta.black?.username || h0.Black || 'Pretas', elo: meta.black?.rating || h0.BlackElo || '' };
    this.plies = game.moves.map((m) => ({ uci: m.uci, san: m.san, fenBefore: m.fenBefore, color: m.color, from: m.from, to: m.to, moveNumber: m.moveNumber, legalCount: new Chess(m.fenBefore).legalMoves().length }));
    this.fens = [game.startFen, ...game.moves.map((m) => m.fenAfter)];
    const op = game.startFen === START_FEN ? identifyOpening(this.plies.map((p) => p.uci)) : { bookPlies: 0, name: null };
    this.bookPlies = op.bookPlies;
    this.opening = op.name;
    this.evals = [];
    this.results = [];
    this.cur = this.plies.length;
    this.showBest = true;
    // Orienta pelo usuário salvo, se ele jogou de pretas
    const u = (settings.username || '').toLowerCase();
    this.orientation = u && this.black.name.toLowerCase() === u ? 'b' : 'w';
    this.build();
  }

  cancel() { this.cancelled = true; this.engine?.stop(); }

  build() {
    const res = this.game.headers.Result;
    const title = `${this.white.name} vs ${this.black.name} · ${res}${this.opening ? ' · ' + this.opening : ''}`;
    app.innerHTML = '';
    this.boardWrap = h('div', { class: 'board-wrap' });
    this.board = new Board(this.boardWrap, { orientation: this.orientation });
    this.board.movable = null;
    this.evalWhite = h('div', { class: 'white' });
    this.evalNum = h('div', { class: 'num' });
    this.evalBar = h('div', { class: 'evalv' }, this.evalWhite, this.evalNum);
    this.topPlayer = h('div', { class: 'player' });
    this.bottomPlayer = h('div', { class: 'player' });
    this.coach = h('div', { class: 'card' });
    this.progress = h('div', { class: 'card' });
    this.graph = h('div');
    this.summaryEl = h('div', { class: 'card' });
    this.movesEl = h('div', { class: 'moves' });
    const depthSel = h('select', { onchange: async (e) => { await storage.set({ depth: +e.target.value }); toast('Profundidade salva. Clique em "Reanalisar".'); } },
      [[10, 'Rápida (10)'], [14, 'Normal (14)'], [18, 'Profunda (18)'], [22, 'Máxima (22)']].map(([v, l]) => h('option', { value: v, selected: v === this.settings.depth }, l)));
    const engineSel = h('select', { onchange: async (e) => { await storage.set({ engine: e.target.value }); toast('Motor salvo. Clique em "Reanalisar".'); } },
      [['stockfish', 'Stockfish 18'], ['builtin', 'Motor Lance Certo (mais fraco)']].map(([v, l]) => h('option', { value: v, selected: v === this.settings.engine }, l)));
    const userInp = h('input', { type: 'text', value: this.settings.username, placeholder: 'seu usuário', style: 'width:150px' });
    userInp.addEventListener('change', () => storage.set({ username: userInp.value.trim() }));

    app.append(
      topbar(title),
      h('div', { class: 'review' },
        h('div', { class: 'boardcol' },
          this.topPlayer,
          h('div', { class: 'boardrow' }, this.evalBar, this.boardWrap),
          this.bottomPlayer,
          h('div', { class: 'controls' },
            h('button', { class: 'btn', title: 'Início (Home)', onclick: () => this.go(0) }, '⏮'),
            h('button', { class: 'btn', title: 'Anterior (←)', onclick: () => this.go(this.cur - 1) }, '◀'),
            h('button', { class: 'btn', title: 'Próximo (→)', onclick: () => this.go(this.cur + 1) }, '▶'),
            h('button', { class: 'btn', title: 'Fim (End)', onclick: () => this.go(this.plies.length) }, '⏭'),
            h('button', { class: 'btn', title: 'Virar tabuleiro', onclick: () => { this.orientation = this.orientation === 'w' ? 'b' : 'w'; this.board.setOrientation(this.orientation); this.render(); } }, '⇅'),
            h('button', { class: 'btn', title: 'Próximo erro', onclick: () => this.nextMistake() }, '⚠ Próximo erro'),
          ),
        ),
        h('div', { class: 'side' },
          this.progress,
          this.coach,
          h('div', { class: 'card' }, this.graph),
          this.summaryEl,
          h('div', { class: 'card' }, this.movesEl),
          h('div', { class: 'card' }, h('details', {},
            h('summary', {}, 'Configurações'),
            h('div', { class: 'settings' },
              h('label', {}, 'Profundidade', depthSel),
              h('label', {}, 'Motor', engineSel),
              h('label', {}, 'Seu usuário', userInp),
              h('label', {}, 'Mostrar melhor lance', h('input', { type: 'checkbox', checked: this.showBest, onchange: (e) => { this.showBest = e.target.checked; this.render(); } })),
              h('button', { class: 'btn', onclick: async () => { this.cancel(); const s = await storage.get(); const r = new Review(this.game, { white: { username: this.white.name, rating: this.white.elo }, black: { username: this.black.name, rating: this.black.elo } }, s); current = r; r.run(); } }, '↺ Reanalisar'),
            ),
          )),
        ),
      ),
    );
    document.onkeydown = (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft') this.go(this.cur - 1);
      else if (e.key === 'ArrowRight') this.go(this.cur + 1);
      else if (e.key === 'Home') this.go(0);
      else if (e.key === 'End') this.go(this.plies.length);
      else if (e.key === 'Escape') close();
      else return;
      e.preventDefault();
    };
    this.render();
  }

  async run() {
    const N = this.plies.length;
    let engine;
    if (this.settings.engine !== 'builtin') {
      try { engine = await new StockfishEngine('stockfish/stockfish-18-lite-single.js', this.settings.depth).init(); }
      catch (e) { console.warn('Stockfish indisponível', e); toast('Stockfish indisponível: usando o motor interno.'); }
    }
    if (!engine) engine = await new BuiltinEngine('builtin-worker.js', 4).init();
    if (this.cancelled) { engine.stop(); return; }
    this.engine = engine;
    const t0 = Date.now();
    for (let i = 0; i <= N; i++) {
      if (this.cancelled) return;
      const c = new Chess(this.fens[i]);
      let ev;
      if (c.isCheckmate()) ev = { score: { mate: 0 }, best: null, second: null };
      else if (c.isStalemate() || c.isInsufficientMaterial()) ev = { score: { cp: 0 }, best: null, second: null };
      else ev = await engine.analyse(this.fens[i]);
      if (this.cancelled) return;
      this.evals[i] = ev;
      this.results = classify(this.plies, this.evals, { bookPlies: this.bookPlies });
      this.progressText = `Analisando com ${engine.name}… ${i + 1}/${N + 1}`;
      this.progressPct = ((i + 1) / (N + 1)) * 100;
      this.render();
    }
    engine.stop();
    this.done = true;
    this.elapsed = Math.round((Date.now() - t0) / 1000);
    this.render();
  }

  go(k) {
    this.cur = Math.max(0, Math.min(this.plies.length, k));
    this.render();
  }

  nextMistake() {
    const bad = ['inaccuracy', 'mistake', 'miss', 'blunder'];
    for (let k = this.cur; k < this.plies.length; k++) {
      const r = this.results[k];
      if (r && bad.includes(r.cls) && k + 1 !== this.cur) { this.go(k + 1); return; }
    }
    toast('Sem mais erros a partir daqui.');
  }

  sanOf(fen, uci) {
    const c = new Chess(fen);
    const m = c.findMove(uci);
    return m ? c.san(m) : uci;
  }

  render() {
    const k = this.cur;
    const c = new Chess(this.fens[k]);
    const last = this.plies[k - 1];
    this.board.setPosition(c, { lastMove: last ? { from: last.from, to: last.to } : null, check: c.inCheck() ? c.kingSquare(c.turn) : null });
    const r = this.results[k - 1];
    // Seta do melhor lance que deveria ter sido jogado
    const arrows = [];
    if (this.showBest && r && !r.isBest && r.bestUci && !['book', 'forced'].includes(r.cls)) arrows.push([r.bestUci.slice(0, 2), r.bestUci.slice(2, 4), 'green']);
    this.board.setArrows(arrows);
    this.board.root.querySelectorAll('.board-badge').forEach((e) => e.remove());
    if (r && last) {
      const v = this.board.viewIndex(last.to);
      this.board.root.append(h('div', { class: 'board-badge', style: `left:${(v & 7) * 12.5}%;top:${(v >> 3) * 12.5}%` }, badge(r.cls)));
    }
    this.renderEval(k);
    this.renderPlayers();
    this.renderProgress();
    this.renderCoach(k);
    this.renderGraph();
    this.renderSummary();
    this.renderMoves();
  }

  renderEval(k) {
    const ev = this.evals[k];
    const turn = this.fens[k].split(' ')[1];
    const pct = ev ? whiteWin(ev.score, turn) : 50;
    this.evalBar.classList.toggle('flipped', this.orientation === 'b');
    this.evalWhite.style.height = pct + '%';
    const txt = ev ? scoreText(ev.score, turn).replace(/^\+/, '') : '';
    this.evalNum.textContent = txt;
    const whiteAhead = pct >= 50;
    const atBottom = (this.orientation === 'w') === whiteAhead;
    this.evalNum.style.top = atBottom ? 'auto' : '4px';
    this.evalNum.style.bottom = atBottom ? '4px' : 'auto';
    this.evalNum.style.color = whiteAhead ? '#1b1d22' : '#f2f2ee';
    this.evalBar.style.height = getComputedStyle(this.boardWrap).width;
  }

  renderPlayers() {
    const sum = summarize(this.plies, this.results);
    const row = (p, color) => [h('span', { class: 'dot ' + color }), p.name, p.elo ? h('span', { class: 'elo' }, `(${p.elo})`) : null,
      h('span', { class: 'acc' }, sum[color].accuracy != null && this.done ? `Precisão ${sum[color].accuracy.toFixed(1)}` : '')];
    const top = this.orientation === 'w' ? ['b', this.black] : ['w', this.white];
    const bottom = this.orientation === 'w' ? ['w', this.white] : ['b', this.black];
    this.topPlayer.replaceChildren(...row(top[1], top[0]).filter(Boolean));
    this.bottomPlayer.replaceChildren(...row(bottom[1], bottom[0]).filter(Boolean));
  }

  renderProgress() {
    if (this.done) {
      this.progress.style.display = 'none';
      return;
    }
    this.progress.style.display = '';
    this.progress.replaceChildren(
      h('div', { class: 'progress-text' }, h('span', {}, this.progressText || 'Preparando o motor…'), h('span', {}, `${Math.round(this.progressPct || 0)}%`)),
      h('div', { class: 'progress' }, h('i', { style: `width:${this.progressPct || 0}%` })),
    );
  }

  renderCoach(k) {
    if (k === 0) {
      this.coach.replaceChildren(h('div', { class: 'coach' }, h('div', {},
        h('div', { class: 'text' }, 'Posição inicial'),
        h('div', { class: 'sub' }, this.opening ? `Abertura: ${this.opening}` : 'Use ◀ ▶ ou as setas do teclado para navegar.'))));
      return;
    }
    const p = this.plies[k - 1];
    const r = this.results[k - 1];
    const num = `${p.moveNumber}${p.color === 'w' ? '.' : '...'} `;
    if (!r) {
      this.coach.replaceChildren(h('div', { class: 'coach' }, h('div', { class: 'text' }, `${num}${p.san}`), h('span', { class: 'evalchip' }, '…')));
      return;
    }
    const ev = this.evals[k];
    const turn = this.fens[k].split(' ')[1];
    const bestSan = r.bestUci ? this.sanOf(p.fenBefore, r.bestUci) : null;
    const subs = [];
    if (r.cls === 'book' && this.opening) subs.push(`Abertura: ${this.opening}`);
    if (!r.isBest && bestSan && !['book', 'forced'].includes(r.cls)) subs.push(`O melhor era ${bestSan}.`);
    const before = this.evals[k - 1];
    if (before?.score.mate > 0 && !(ev.score.mate < 0) && r.cls !== 'best') subs.push(`Havia mate em ${before.score.mate}.`);
    const mover = p.color === 'w' ? 'As brancas' : 'As pretas', other = p.color === 'w' ? 'As pretas' : 'As brancas';
    if (ev.score.mate < 0) subs.push(`${mover} têm mate em ${-ev.score.mate}.`);
    else if (ev.score.mate > 0) subs.push(`${other} têm mate em ${ev.score.mate}.`);
    this.coach.replaceChildren(h('div', { class: 'coach' },
      badge(r.cls),
      h('div', {}, h('div', { class: 'text' }, CLASSES[r.cls].text(num + p.san)), subs.length ? h('div', { class: 'sub' }, subs.join(' ')) : null),
      h('span', { class: 'evalchip' }, scoreText(ev.score, turn)),
    ));
  }

  renderGraph() {
    const W = 400, H = 90, N = this.plies.length;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const ev = this.evals[i];
      if (!ev) break;
      const pct = whiteWin(ev.score, this.fens[i].split(' ')[1]);
      pts.push([(i / Math.max(1, N)) * W, H - (pct / 100) * H]);
    }
    let svg = `<svg class="graph" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
    if (pts.length > 1) {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      svg += `<path d="${d} L${pts.at(-1)[0]},${H} L0,${H} Z" fill="#f2f2ee"/>`;
    }
    svg += `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="#7f8796" stroke-dasharray="4 4" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    this.results.forEach((r, i) => {
      if (!r || !['brilliant', 'great', 'mistake', 'miss', 'blunder'].includes(r.cls) || !pts[i + 1]) return;
      svg += `<circle cx="${pts[i + 1][0]}" cy="${pts[i + 1][1]}" r="4" fill="${CLASSES[r.cls].color}" stroke="#121722" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
    });
    const x = (this.cur / Math.max(1, N)) * W;
    svg += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="#f2b33d" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
    this.graph.innerHTML = svg;
    this.graph.firstChild.onclick = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      this.go(Math.round(((e.clientX - rect.left) / rect.width) * N));
    };
  }

  renderSummary() {
    const sum = summarize(this.plies, this.results);
    const fmt = (a) => (a == null ? '–' : a.toFixed(1));
    const rows = [
      h('div', { class: 'l head' }, this.white.name), h('div', { class: 'mid head' }, ''), h('div', { class: 'r head' }, this.black.name),
      h('div', { class: 'l accrow' }, fmt(sum.w.accuracy)), h('div', { class: 'mid' }, 'Precisão'), h('div', { class: 'r accrow' }, fmt(sum.b.accuracy)),
    ];
    for (const cls of CLASS_ORDER) {
      rows.push(
        h('div', { class: 'l', style: `color:${CLASSES[cls].color}` }, sum.w.counts[cls] || 0),
        h('div', { class: 'mid' }, badge(cls, true), h('span', { style: 'min-width:120px' }, CLASSES[cls].label)),
        h('div', { class: 'r', style: `color:${CLASSES[cls].color}` }, sum.b.counts[cls] || 0),
      );
    }
    this.summaryEl.replaceChildren(h('div', { class: 'summary' }, rows), this.done ? h('div', { class: 'muted small', style: 'margin-top:10px;text-align:center' }, `Análise concluída em ${this.elapsed}s · ${this.engine?.name || ''}`) : null);
  }

  renderMoves() {
    const el = this.movesEl;
    const scroll = el.scrollTop;
    el.replaceChildren();
    const cell = (i) => {
      const p = this.plies[i];
      if (!p) return h('span');
      const r = this.results[i];
      return h('span', { class: 'mv' + (this.cur === i + 1 ? ' cur' : ''), onclick: () => this.go(i + 1) }, r ? badge(r.cls, true) : null, p.san);
    };
    let i = 0;
    if (this.plies[0]?.color === 'b') { el.append(h('span', { class: 'n' }, this.plies[0].moveNumber + '.'), h('span', { class: 'mv' }, '…'), cell(0)); i = 1; }
    for (; i < this.plies.length; i += 2) el.append(h('span', { class: 'n' }, this.plies[i].moveNumber + '.'), cell(i), cell(i + 1));
    el.scrollTop = scroll;
    const cur = el.querySelector('.mv.cur');
    if (cur) {
      const top = cur.offsetTop - el.offsetTop;
      if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - 30) el.scrollTop = top - el.clientHeight / 2;
    }
  }
}

// ---------- início ----------
(async () => {
  const s = await storage.get();
  if (info.pgn) { start(info.pgn, {}); return; }
  if (!info.id && !s.username) { formScreen(info.url ? 'Não identifiquei a partida nesta página. Informe seu usuário para revisar sua última partida, ou cole o PGN.' : ''); return; }
  loadingScreen('Buscando a partida no chess.com…');
  const g = await findGame(info, s.username).catch(() => null);
  if (g) startFromApi(g);
  else formScreen(info.id ? 'Não encontrei esta partida automaticamente. Informe seu usuário do chess.com ou cole o PGN.' : 'Não encontrei partidas recentes.');
})();
