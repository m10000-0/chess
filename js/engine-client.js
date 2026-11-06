// Interface assíncrona para o motor (Web Worker com fallback na thread principal).
import { chooseMove, analysePosition } from './engine.js';

let worker = null, seq = 0;
const pending = new Map();
try {
  worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.error) p.reject(new Error(e.data.error));
    else p.resolve(e.data.result);
  };
  worker.onerror = () => { worker = null; for (const p of pending.values()) p.fallback(); pending.clear(); };
} catch {
  worker = null;
}

function run(msg, local) {
  if (!worker) return new Promise((r) => setTimeout(() => r(local()), 30));
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject, fallback: () => resolve(local()) });
    worker.postMessage({ id, ...msg });
  });
}

export const engineMove = (fen, level) => run({ type: 'move', fen, level }, () => chooseMove(fen, level));
export const engineAnalyse = (fen, depth = 5, timeMs = 1500) => run({ type: 'analyse', fen, depth, timeMs }, () => analysePosition(fen, { depth, timeMs }));
