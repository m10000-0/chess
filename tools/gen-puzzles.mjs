// Gera problemas táticos a partir de partidas do próprio motor e valida cada solução.
// Uso: node tools/gen-puzzles.mjs [jogos] [semente]
import { writeFileSync } from 'node:fs';
import { Chess, toUci, typeOf, colorOf } from '../js/chess.js';
import { Searcher, VALUES, MATE, evaluate } from '../js/engine.js';
import { matingMoves, forcesMate } from '../js/solver.js';

const GAMES = parseInt(process.argv[2] || '400', 10);
let seed = parseInt(process.argv[3] || '20261106', 10);
const rand = () => {
  // mulberry32
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const material = (c) => {
  let s = 0;
  for (const p of c.board) if (p && typeOf(p) !== 'k') s += (colorOf(p) === c.turn ? 1 : -1) * VALUES[typeOf(p)];
  return s;
};

function pickGameMove(chess, ply) {
  const moves = chess.legalMoves();
  if (ply < 6 && rand() < 0.7) return moves[Math.floor(rand() * moves.length)];
  const s = new Searcher(chess);
  const res = s.analyse({ depth: rand() < 0.5 ? 1 : 2, timeMs: 300, multi: true });
  // Ruído grande -> erros frequentes -> oportunidades táticas
  const noise = 60 + rand() * 260;
  const noisy = res.map((r) => ({ r, n: r.score + (rand() - 0.5) * 2 * noise }));
  noisy.sort((a, b) => b.n - a.n);
  return noisy[0].r.move;
}

const puzzles = [];
const seen = new Set();
const stats = { m1: 0, m2: 0, m3: 0, t: 0 };

function checks(chess, m) { chess.makeMove(m); const c = chess.inCheck(); chess.unmakeMove(); return c; }

function themesFor(chess, line) {
  const t = new Set();
  const c = chess.clone();
  for (const u of line) {
    const mv = c.move(u);
    if (mv.promotion) t.add('promocao');
    if (mv.flags === 'k' || mv.flags === 'q') t.add('roque');
  }
  // Garfo: após o primeiro lance a peça movida ataca 2+ alvos valiosos
  const c2 = chess.clone();
  const first = c2.move(line[0]);
  const piece = c2.get(first.to);
  const targets = c2.pieceAttacks(first.to).filter((sq) => {
    const p = c2.board[sq];
    if (!p || colorOf(p) === colorOf(piece)) return false;
    return typeOf(p) === 'k' || VALUES[typeOf(p)] > VALUES[typeOf(piece)];
  });
  if (targets.length >= 2) t.add('garfo');
  if (first.captured) t.add('captura');
  if (c2.inCheck()) t.add('xeque');
  return [...t];
}

function addPuzzle(pre, chess, line, kind, extra) {
  const key = chess.positionKey();
  if (seen.has(key)) return false;
  seen.add(key);
  const first = chess.findMove(line[0]);
  const quiet = !checks(chess, first);
  const base = { m1: 650, m2: 1250, m3: 1750, t1: 1000, t3: 1450 }[kind];
  let rating = base + (quiet ? 180 : 0) + (first.captured ? -60 : 60) + Math.round((rand() - 0.5) * 200);
  if (extra?.gain) rating += Math.min(200, Math.round((extra.gain - 300) / 4));
  const themes = themesFor(chess, line);
  if (kind.startsWith('m')) { themes.unshift('mateEm' + kind[1]); const i = themes.indexOf('xeque'); if (i >= 0) themes.splice(i, 1); }
  else themes.unshift('vantagem');
  puzzles.push({ id: 0, fen: pre.fenBefore, pre: pre.uci, moves: line, rating: Math.max(400, rating), themes });
  return true;
}

function tryMate(chess, pre) {
  // Evita posições já totalmente desequilibradas (mate "óbvio" com muita vantagem)
  if (material(chess) > 700) return false;
  const m1 = matingMoves(chess, 1);
  if (m1.length === 1) {
    if (stats.m1 < 220 && addPuzzle(pre, chess, [toUci(m1[0])], 'm1')) stats.m1++;
    return true;
  }
  if (m1.length) return true;
  if (stats.m2 < 220 && forcesMate(chess, 2)) {
    const m2 = matingMoves(chess, 2);
    if (m2.length !== 1) return true;
    const first = m2[0];
    chess.makeMove(first);
    // Escolhe a defesa com resposta de mate única (preferindo a mais "teimosa")
    let best = null;
    for (const r of chess.legalMoves()) {
      chess.makeMove(r);
      const mates = matingMoves(chess, 1);
      chess.unmakeMove();
      if (mates.length === 1 && (!best || (!best.reply.captured && r.captured))) best = { reply: r, mate: mates[0] };
    }
    chess.unmakeMove();
    if (best && addPuzzle(pre, chess, [toUci(first), toUci(best.reply), toUci(best.mate)], 'm2')) stats.m2++;
    return true;
  }
  if (stats.m3 < 80 && rand() < 0.5) {
    // Mate em 3 apenas com xeques no primeiro lance (busca limitada) e depois validação completa
    const checksFirst = chess.legalMoves().filter((m) => checks(chess, m));
    if (!checksFirst.length) return false;
    let candidate = null;
    for (const m of checksFirst) {
      chess.makeMove(m);
      let all = true;
      for (const r of chess.legalMoves()) {
        chess.makeMove(r);
        const ok = forcesMate(chess, 2);
        chess.unmakeMove();
        if (!ok) { all = false; break; }
      }
      chess.unmakeMove();
      if (all) { if (candidate) return true; candidate = m; }
    }
    if (!candidate) return false;
    // Validação: nenhum outro lance (inclusive quietos) força mate em 3
    const others = chess.legalMoves().filter((m) => m !== candidate && !checks(chess, m));
    for (const m of others) {
      chess.makeMove(m);
      let all = true;
      for (const r of chess.legalMoves()) {
        chess.makeMove(r);
        const ok = forcesMate(chess, 2);
        chess.unmakeMove();
        if (!ok) { all = false; break; }
      }
      chess.unmakeMove();
      if (all) return true;
    }
    // Monta a linha: defesa -> lance único de mate em 2 -> defesa -> mate
    const line = [candidate];
    chess.makeMove(candidate);
    let built = false;
    for (const r of chess.legalMoves()) {
      chess.makeMove(r);
      const second = matingMoves(chess, 2);
      if (second.length === 1) {
        chess.makeMove(second[0]);
        for (const r2 of chess.legalMoves()) {
          chess.makeMove(r2);
          const fin = matingMoves(chess, 1);
          chess.unmakeMove();
          if (fin.length === 1) { line.push(r, second[0], r2, fin[0]); built = true; break; }
        }
        chess.unmakeMove();
      }
      chess.unmakeMove();
      if (built) break;
    }
    chess.unmakeMove();
    if (built && addPuzzle(pre, chess, line.map(toUci), 'm3')) stats.m3++;
    return true;
  }
  return false;
}

function tryTactic(chess, pre) {
  if (stats.t >= 360) return;
  if (chess.inCheck()) return;
  const before = material(chess);
  if (Math.abs(before) > 250) return; // posição precisa estar equilibrada antes do golpe
  const s = new Searcher(chess);
  const res = s.analyse({ depth: 3, timeMs: 2000, multi: true });
  if (res.length < 2 || s.completedDepth < 3) return;
  const [b1, b2] = res;
  if (b1.score > MATE - 100) return;
  if (b1.score < 280 || b1.score > 1400) return;
  if (b1.score - b2.score < 250) return;
  if (evaluate(chess) > b1.score - 200) return; // ganho já "estático" (ex.: só pegar peça solta é ok, mas não posição já ganha)
  const line = [toUci(b1.move)];
  // Continuação: resposta do adversário + segundo lance se também for único
  chess.makeMove(b1.move);
  const s2 = new Searcher(chess);
  const rep = s2.analyse({ depth: 3, timeMs: 1500 });
  if (rep.length) {
    chess.makeMove(rep[0].move);
    const s3 = new Searcher(chess);
    const fol = s3.analyse({ depth: 3, timeMs: 1500, multi: true });
    if (fol.length >= 2 && fol[0].score - fol[1].score >= 250 && fol[0].score < MATE - 100 && (fol[0].move.captured || fol[0].move.promotion)) {
      line.push(toUci(rep[0].move), toUci(fol[0].move));
    }
    chess.unmakeMove();
  }
  chess.unmakeMove();
  if (addPuzzle(pre, chess, line, line.length === 1 ? 't1' : 't3', { gain: b1.score })) stats.t++;
}

const t0 = Date.now();
for (let g = 0; g < GAMES; g++) {
  const chess = new Chess();
  let fromThisGame = 0;
  for (let ply = 0; ply < 160; ply++) {
    if (chess.isGameOver()) break;
    const mv = pickGameMove(chess, ply);
    const rec = chess.move(toUci(mv));
    if (ply < 12 || fromThisGame >= 3 || chess.isGameOver()) continue;
    const pre = { fenBefore: rec.fenBefore, uci: rec.uci };
    const before = puzzles.length;
    const mateFound = tryMate(chess, pre);
    if (!mateFound && rand() < 0.35) tryTactic(chess, pre);
    if (puzzles.length > before) fromThisGame++;
  }
  if (g % 20 === 0) console.error(`jogo ${g}: ${JSON.stringify(stats)} (${Math.round((Date.now() - t0) / 1000)}s)`);
}

puzzles.sort((a, b) => a.rating - b.rating);
puzzles.forEach((p, i) => { p.id = 'p' + String(i + 1).padStart(4, '0'); });
const out = `// Gerado por tools/gen-puzzles.mjs — cada solução foi verificada por busca.\n// Formato: fen = posição antes do lance do adversário (pre); moves = solução (UCI), alternando você/adversário.\nexport const PUZZLES = [\n${puzzles.map((p) => '  ' + JSON.stringify(p)).join(',\n')}\n];\n`;
writeFileSync(new URL('../js/data/puzzles.js', import.meta.url), out);
console.error('total', puzzles.length, stats);
