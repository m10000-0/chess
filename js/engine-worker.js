// Web Worker: executa o motor fora da thread principal.
import { chooseMove, analysePosition } from './engine.js';

self.onmessage = (e) => {
  const { id, type, fen, level, depth, timeMs } = e.data;
  let result;
  try {
    if (type === 'move') result = chooseMove(fen, level);
    else result = analysePosition(fen, { depth, timeMs });
    self.postMessage({ id, result });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
