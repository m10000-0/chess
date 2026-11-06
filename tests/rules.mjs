// Testes de regras: SAN, fim de jogo, roque, en passant, promoção.
import { Chess } from '../js/chess.js';
import { analysePosition, MATE } from '../js/engine.js';

export function runRules(assert) {
  const c = new Chess();
  for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'O-O', 'Be7']) assert(c.move(m), `lance SAN ${m}`);
  assert(c.history.map((m) => m.san).join(' ') === 'e4 e5 Nf3 Nc6 Bc4 Nf6 O-O Be7', 'SAN gerado');
  assert(c.pgnMoves() === '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Be7', 'PGN: ' + c.pgnMoves());
  c.undo(); c.undo();
  assert(c.fen() === 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', 'desfazer restaura FEN');

  // Mate do louco
  const f = new Chess();
  ['f3', 'e5', 'g4', 'Qh4'].forEach((m) => f.move(m));
  assert(f.isCheckmate() && f.result().winner === 'b', 'mate do louco');
  assert(f.history[3].san === 'Qh4#', 'SAN com #');

  // Desambiguação
  const d = new Chess('1k6/8/8/8/4K3/8/8/R6R w - - 0 1');
  const sans = d.moves().map((m) => m.san);
  assert(sans.includes('Rad1') && sans.includes('Rhd1') && !sans.includes('Rd1'), 'desambiguação de torres: ' + sans.filter((s) => s.includes('d1')));

  // En passant
  const e = new Chess('k7/3p4/8/4P3/8/8/8/K7 b - - 0 1');
  e.move('d5');
  const ep = e.move('exd6');
  assert(ep && ep.flags === 'e' && !e.get('d5'), 'en passant');

  // Promoção
  const p = new Chess('k7/4P3/8/8/8/8/8/7K w - - 0 1');
  const pr = p.move('e7e8n');
  assert(pr && p.get('e8') === 'N' && pr.san === 'e8=N', 'promoção a cavalo');

  // Afogamento e material insuficiente
  assert(new Chess('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1').isStalemate(), 'afogamento');
  assert(new Chess('k7/8/1K6/8/8/8/8/6N1 w - - 0 1').isInsufficientMaterial(), 'material insuficiente');

  // Roque proibido através de casa atacada
  const r = new Chess('r3k2r/pppppppp/b7/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 1');
  assert(!r.findMove('e1g1') && r.findMove('e1c1'), 'roque através de casa atacada');

  // Repetição tripla
  const t = new Chess();
  for (let i = 0; i < 2; i++) ['Nf3', 'Nf6', 'Ng1', 'Ng8'].forEach((m) => t.move(m));
  assert(t.isThreefold() && t.isDraw(), 'repetição tripla');

  // Motor encontra mate em 2
  const a = analysePosition('5r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1', { depth: 4, timeMs: 5000 });
  assert(a.best === 'd5g8' && a.score > MATE - 10, 'motor encontra mate sufocado: ' + JSON.stringify(a));
}
