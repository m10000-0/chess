// Valida o conteúdo: aulas (posições, soluções, estrelas alcançáveis) e problemas (soluções verificadas).
import { Chess, sqIndex, colorOf } from '../js/chess.js';
import { COURSES } from '../js/data/lessons.js';
import { PUZZLES } from '../js/data/puzzles.js';
import { matingMoves } from '../js/solver.js';

function legalPosition(c) {
  const wk = c.kingSquare('w'), bk = c.kingSquare('b');
  if (wk >= 0 && bk >= 0 && Math.max(Math.abs((wk >> 3) - (bk >> 3)), Math.abs((wk & 7) - (bk & 7))) <= 1) return 'reis adjacentes';
  const other = c.turn === 'w' ? 'b' : 'w';
  if (c.inCheck(other)) return 'lado que não joga está em xeque';
  return null;
}

// Busca em profundidade: é possível visitar todas as estrelas (sem o adversário jogar)?
function starsSolvable(fen, targets, maxDepth = 14) {
  const c = new Chess(fen);
  const me = c.turn;
  const capture = !targets;
  const tset = capture ? c.board.map((p, i) => (p && colorOf(p) !== me ? i : -1)).filter((i) => i >= 0) : targets.map(sqIndex);
  const seen = new Map();
  function dfs(remaining, depth) {
    if (!remaining.length) return true;
    if (depth === 0) return false;
    const key = c.board.join(',') + remaining.join(',');
    if ((seen.get(key) ?? -1) >= depth) return false;
    seen.set(key, depth);
    c.turn = me; c.ep = -1;
    for (const m of c.legalMoves()) {
      c.makeMove(m);
      const rem = remaining.filter((t) => t !== m.to);
      const ok = dfs(rem, depth - 1);
      c.unmakeMove();
      c.turn = me;
      if (ok) return true;
    }
    return false;
  }
  return dfs(tset, maxDepth);
}

export function runContent(assert) {
  const ids = new Set();
  for (const course of COURSES) {
    for (const lesson of course.lessons) {
      assert(!ids.has(lesson.id), `id de aula duplicado: ${lesson.id}`);
      ids.add(lesson.id);
      lesson.steps.forEach((st, n) => {
        const where = `${lesson.id}#${n + 1}`;
        let c;
        if (st.fen) {
          try { c = new Chess(st.fen); } catch (e) { assert(false, `${where}: ${e.message}`); return; }
          const bad = st.type !== 'info' && st.type !== 'stars' ? legalPosition(c) : null;
          assert(!bad, `${where}: posição ilegal (${bad})`);
        }
        for (const s of [...(st.highlight || []), ...(st.targets || []), ...(st.arrows || []).flat().filter((x) => /^[a-h][1-8]$/.test(x))]) {
          assert(/^[a-h][1-8]$/.test(s), `${where}: casa inválida ${s}`);
        }
        if (st.type === 'stars') {
          assert(starsSolvable(st.fen, st.targets), `${where}: estrelas inalcançáveis`);
        }
        if (st.type === 'move') {
          if (st.pre) assert(c.move(st.pre), `${where}: lance prévio ilegal ${st.pre}`);
          st.moves.forEach((ply, k) => {
            for (const alt of ply.split('|')) {
              const t = c.clone();
              assert(t.findMove(alt.trim()), `${where}: lance ${k + 1} ilegal: ${alt}`);
              if (st.goal === 'mate' && k === st.moves.length - 1) {
                t.move(alt.trim());
                assert(t.isCheckmate(), `${where}: ${alt} não é mate`);
              }
            }
            c.move(ply.split('|')[0]);
          });
          assert(st.moves.length % 2 === 1, `${where}: a sequência deve terminar num lance do aluno`);
        }
        if (st.type === 'play') assert(['mate', 'promote'].includes(st.goal), `${where}: objetivo inválido`);
        if (st.type === 'find') assert(st.targets?.length, `${where}: sem alvos`);
      });
    }
  }

  const pids = new Set();
  let checkedUnique = 0;
  for (const p of PUZZLES) {
    assert(!pids.has(p.id), `problema duplicado ${p.id}`);
    pids.add(p.id);
    const c = new Chess(p.fen);
    assert(c.move(p.pre), `${p.id}: lance prévio ilegal`);
    const start = c.clone();
    for (const u of p.moves) assert(c.move(u), `${p.id}: lance ilegal ${u}`);
    const mate = p.themes.find((t) => t.startsWith('mateEm'));
    if (mate) {
      assert(c.isCheckmate(), `${p.id}: solução não termina em mate`);
      const n = parseInt(mate.slice(6), 10);
      assert(p.moves.length === 2 * n - 1, `${p.id}: comprimento da solução incompatível com mate em ${n}`);
      if (n <= 2 && checkedUnique < 400) {
        checkedUnique++;
        const firsts = matingMoves(start, n);
        assert(firsts.length === 1, `${p.id}: primeiro lance não é único (${firsts.length})`);
        if (n === 2) assert(matingMoves(start, 1).length === 0, `${p.id}: existe mate mais curto`);
      }
    }
  }
}
