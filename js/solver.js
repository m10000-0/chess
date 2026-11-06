// Resolvedor de mate forçado (busca exaustiva) — usado para validar problemas.

function orderAttacker(chess, moves) {
  // Xeques e capturas primeiro: encontra mates mais rápido
  return moves
    .map((m) => {
      chess.makeMove(m);
      const check = chess.inCheck();
      chess.unmakeMove();
      return { m, k: (check ? 2 : 0) + (m.captured ? 1 : 0) };
    })
    .sort((a, b) => b.k - a.k)
    .map((x) => x.m);
}

// Verdadeiro se o lado a jogar força mate em até n lances.
export function forcesMate(chess, n) {
  if (n <= 0) return false;
  for (const m of orderAttacker(chess, chess.legalMoves())) {
    chess.makeMove(m);
    const ok = defenderLoses(chess, n - 1);
    chess.unmakeMove();
    if (ok) return true;
  }
  return false;
}

// Defensor a jogar; verdadeiro se todas as respostas levam a mate em até n.
function defenderLoses(chess, n) {
  const replies = chess.legalMoves();
  if (!replies.length) return chess.inCheck();
  if (n <= 0) return false;
  for (const r of replies) {
    chess.makeMove(r);
    const ok = forcesMate(chess, n);
    chess.unmakeMove();
    if (!ok) return false;
  }
  return true;
}

// Lista os lances que forçam mate em até n (pode ser cara para n >= 3).
export function matingMoves(chess, n) {
  const out = [];
  for (const m of chess.legalMoves()) {
    chess.makeMove(m);
    if (defenderLoses(chess, n - 1)) out.push(m);
    chess.unmakeMove();
  }
  return out;
}

// Menor n (até max) para o qual existe mate forçado; 0 se não houver.
export function mateDistance(chess, max) {
  for (let n = 1; n <= max; n++) if (forcesMate(chess, n)) return n;
  return 0;
}

// Respostas do defensor após um lance do atacante, cada uma com seus lances de mate em n-1
export function defenderReplies(chess, n) {
  const res = [];
  for (const r of chess.legalMoves()) {
    chess.makeMove(r);
    res.push({ reply: r, mates: n - 1 > 0 ? matingMoves(chess, n - 1) : [] });
    chess.unmakeMove();
  }
  return res;
}
