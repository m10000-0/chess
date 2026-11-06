// Utilidades de interface: criação de elementos, texto formatado, sons, avisos e modais.
import * as store from './store.js';

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Markdown mínimo: **negrito**, parágrafos, listas com "•" ou "1."
export function md(text = '') {
  const blocks = esc(text).split(/\n\n+/);
  return blocks
    .map((b) => {
      const lines = b.split('\n');
      const fmt = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      if (lines.every((l) => /^(•|\d+\.)\s/.test(l))) {
        const ordered = /^\d+\./.test(lines[0]);
        const items = lines.map((l) => `<li>${fmt(l.replace(/^(•|\d+\.)\s/, ''))}</li>`).join('');
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return `<p>${fmt(lines.join('<br>'))}</p>`;
    })
    .join('');
}

let toastTimer;
export function toast(msg, ms = 1800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function modal({ icon = '', title, body = '', actions = [] }) {
  const back = h('div', { class: 'modal-back' });
  const close = () => back.remove();
  const box = h('div', { class: 'card modal' },
    icon ? h('div', { class: 'big' }, icon) : null,
    h('h2', {}, title),
    typeof body === 'string' ? h('div', { class: 'muted', html: md(body) }) : body,
    h('div', { class: 'row', style: 'justify-content:center;margin-top:14px' },
      actions.map((a) => h('button', { class: 'btn ' + (a.primary ? 'primary' : ''), onclick: () => { close(); a.onClick && a.onClick(); } }, a.label))),
  );
  back.append(box);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  return close;
}

// ---------- Sons (sintetizados, sem arquivos) ----------
let ctx;
function audio() {
  if (!store.get().settings.sound) return null;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch { return null; }
}
function tone(freq, dur = 0.08, type = 'sine', gain = 0.12, when = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
function knock(gain = 0.25, freq = 180) {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * 0.05);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq * 6;
  const g = a.createGain(); g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}
export const sound = {
  move: () => knock(0.35, 220),
  capture: () => { knock(0.5, 160); tone(140, 0.06, 'triangle', 0.08); },
  check: () => { knock(0.35, 220); tone(660, 0.09, 'square', 0.04, 0.02); },
  good: () => { tone(660, 0.1, 'sine', 0.1); tone(880, 0.14, 'sine', 0.1, 0.09); },
  bad: () => { tone(220, 0.16, 'sawtooth', 0.05); },
  win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'sine', 0.09, i * 0.1)); },
  tick: () => tone(1200, 0.03, 'square', 0.03),
};
export function moveSound(rec, chess) {
  if (!rec) return;
  if (chess && chess.inCheck()) sound.check();
  else if (rec.captured) sound.capture();
  else sound.move();
}

export function sparkline(values, { width = 300, height = 60 } = {}) {
  if (values.length < 2) return h('div', { class: 'muted small' }, 'Resolva alguns problemas para ver seu gráfico de rating.');
  const min = Math.min(...values) - 10, max = Math.max(...values) + 10;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - ((v - min) / (max - min)) * (height - 6) - 3]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const svg = `<svg class="spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><path d="${d} L${width},${height} L0,${height} Z" fill="color-mix(in srgb, var(--accent) 18%, transparent)"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>`;
  return h('div', { html: svg });
}
