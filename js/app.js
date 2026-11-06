// Roteador da aplicação (hash) e inicialização.
import { homeView } from './views/home.js';
import { coursesView, lessonView } from './views/lessons.js';
import { puzzlesView, rushView } from './views/puzzles.js';
import { coordsView, computerView } from './views/training.js';
import * as store from './store.js';

const ROUTES = {
  '': homeView,
  aulas: coursesView,
  aula: lessonView,
  problemas: puzzlesView,
  'contra-relogio': rushView,
  coordenadas: coordsView,
  computador: computerView,
};
const TITLES = { '': 'Início', aulas: 'Aulas', aula: 'Aula', problemas: 'Problemas', 'contra-relogio': 'Contra o relógio', coordenadas: 'Coordenadas', computador: 'Contra o computador' };

const view = document.getElementById('view');
let cleanup = null;

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const name = ROUTES[parts[0] || ''] ? parts[0] || '' : '';
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  document.querySelectorAll('.modal-back').forEach((m) => m.remove());
  view.innerHTML = '';
  cleanup = ROUTES[name](view, parts.slice(1)) || null;
  document.title = `${TITLES[name]} · Lance Certo`;
  const navKey = name === 'aula' ? 'aulas' : name;
  document.querySelectorAll('.nav-links a').forEach((a) => a.classList.toggle('active', a.dataset.route === navKey));
  window.scrollTo(0, 0);
}

const soundBtn = document.getElementById('sound-toggle');
const drawSound = () => {
  const on = store.get().settings.sound;
  soundBtn.textContent = on ? '🔊 Som ligado' : '🔇 Som desligado';
  soundBtn.setAttribute('aria-pressed', String(on));
};
soundBtn.addEventListener('click', () => { store.update((s) => { s.settings.sound = !s.settings.sound; }); drawSound(); });
drawSound();

window.addEventListener('hashchange', route);
route();
