// Página inicial: resumo do progresso e atalhos.
import { h, sparkline } from '../ui.js';
import * as store from '../store.js';
import { ALL_LESSONS, COURSES } from '../data/lessons.js';
import { PUZZLES } from '../data/puzzles.js';
import { nextLesson } from './lessons.js';

export function homeView(root) {
  const s = store.get();
  const done = ALL_LESSONS.filter((l) => s.lessons[l.id]).length;
  const nxt = nextLesson();
  const course = nxt && COURSES.find((c) => c.id === nxt.course);
  const streak = store.dayStreak();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const feature = (href, icon, title, text, extra) => h('a', { class: 'card feature', href },
    h('div', { class: 'row' }, h('div', { class: 'icon' }, icon), h('span', { class: 'spacer' }), extra || null),
    h('h3', { style: 'margin:0' }, title), h('p', {}, text));

  root.append(h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('h1', {}, `${greet}! Pronto para treinar?`), h('p', {}, 'Tudo aqui funciona sem outros jogadores: aprenda com aulas, resolva problemas e enfrente o computador no seu ritmo.')),
    h('div', { class: 'hero' },
      h('div', { class: 'card main' },
        h('div', { class: 'muted small' }, nxt ? `Continuar · ${course.title}` : 'Todas as aulas concluídas'),
        h('h2', { style: 'margin:6px 0 4px' }, nxt ? nxt.title : 'Parabéns! 🎉'),
        h('p', { class: 'muted' }, nxt ? nxt.summary : 'Você concluiu todos os cursos. Mantenha o ritmo com os problemas diários.'),
        h('div', { class: 'row', style: 'margin:10px 0 14px' }, h('div', { class: 'progress', style: 'flex:1' }, h('i', { style: `width:${(done / ALL_LESSONS.length) * 100}%` })), h('span', { class: 'small muted' }, `${done}/${ALL_LESSONS.length}`)),
        h('a', { class: 'btn primary', href: nxt ? `#/aula/${nxt.course}/${nxt.id}` : '#/problemas' }, nxt ? (done ? 'Continuar aula' : 'Começar a primeira aula') : 'Resolver problemas'),
      ),
      h('div', { class: 'card' },
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('b', {}, s.puzzle.rating), h('span', {}, 'Rating em problemas')),
          h('div', { class: 'stat' }, h('b', {}, `${streak} 🔥`), h('span', {}, streak === 1 ? 'dia seguido' : 'dias seguidos')),
        ),
        h('div', { style: 'margin-top:12px' }, sparkline(s.puzzle.ratingLog.slice(-40))),
        h('div', { class: 'muted small', style: 'margin-top:6px' }, `${s.puzzle.solved} resolvidos · melhor sequência ${s.puzzle.bestStreak}`),
      ),
    ),
    h('div', { class: 'grid cols-3' },
      feature('#/aulas', '♙', 'Aulas', `${ALL_LESSONS.length} aulas interativas: das regras básicas a táticas e finais.`, h('span', { class: 'chip' }, `${done}/${ALL_LESSONS.length}`)),
      feature('#/problemas', '♘', 'Problemas', `${PUZZLES.length} problemas com solução verificada, escolhidos para o seu nível.`, h('span', { class: 'chip accent' }, s.puzzle.rating)),
      feature('#/contra-relogio', '⏱', 'Contra o relógio', 'Quantos problemas você resolve em 3 minutos? Três erros e acabou.', h('span', { class: 'chip' }, `recorde ${s.rush.best}`)),
      feature('#/coordenadas', '⌗', 'Coordenadas', 'Aprenda o nome de cada casa clicando rápido contra o tempo.', h('span', { class: 'chip' }, `recorde ${s.coords.best}`)),
      feature('#/computador', '♚', 'Contra o computador', 'Seis níveis, com dicas, avaliação e opção de voltar lances.', h('span', { class: 'chip' }, `${s.games.won}V ${s.games.drawn}E ${s.games.lost}D`)),
    ),
    h('p', { class: 'muted small', style: 'margin-top:28px' }, 'Seu progresso fica salvo apenas neste navegador. ', h('a', { href: '#/', onclick: (e) => { e.preventDefault(); if (confirm('Apagar todo o progresso?')) { store.reset(); location.reload(); } } }, 'Apagar progresso')),
  ));
}
