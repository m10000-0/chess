// Progresso salvo no navegador (localStorage), com tolerância a falhas.
const KEY = 'lance-certo:v1';
const DEFAULTS = {
  lessons: {}, // id -> { done: true, at }
  puzzle: { rating: 1000, solved: 0, failed: 0, streak: 0, bestStreak: 0, history: {}, ratingLog: [] },
  rush: { best: 0, runs: 0 },
  coords: { best: 0, runs: 0 },
  games: { played: 0, won: 0, lost: 0, drawn: 0, level: 3, color: 'w', saved: null },
  days: {}, // 'AAAA-MM-DD' -> nº de atividades
  settings: { sound: true, coords: true },
};

let state;
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};
    state = deepMerge(structuredClone(DEFAULTS), data);
  } catch {
    state = structuredClone(DEFAULTS);
  }
}
function deepMerge(a, b) {
  for (const k of Object.keys(b || {})) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]);
    else a[k] = b[k];
  }
  return a;
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* armazenamento indisponível */ }
}
export function get() { if (!state) load(); return state; }
export function update(fn) { fn(get()); save(); }
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function logActivity() { update((s) => { const t = today(); s.days[t] = (s.days[t] || 0) + 1; }); }
export function dayStreak() {
  const s = get();
  let n = 0;
  const d = new Date();
  // Conta hoje (se houver atividade) e dias anteriores consecutivos
  for (;;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (s.days[k]) n++;
    else if (n > 0 || k !== today()) break;
    d.setDate(d.getDate() - 1);
    if (n > 3650) break;
  }
  return n;
}
export function reset() { state = structuredClone(DEFAULTS); save(); }
