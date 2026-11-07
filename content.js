// Injeta o botão "Revisão Lance Certo" nas páginas de partida do chess.com e abre o painel de revisão.
(() => {
  if (window.__lanceCerto) return;
  window.__lanceCerto = true;

  const GAME_RE = /\/game\/(?:(live|daily|computer)\/)?(\d+)/;
  const LABEL_RE = /^(game review|review|revis[aã]o( da| de)? partida|revisar( partida)?|analy[sz]e|analis(ar|e)( partida)?)$/i;
  const EXT_ORIGIN = new URL(chrome.runtime.getURL('')).origin;

  function gameInfo() {
    let id = null, type = null;
    const m = location.pathname.match(GAME_RE);
    if (m) { id = m[2]; type = m[1] || 'live'; }
    if (!id) {
      // Ex.: modal de fim de partida com link para a página do jogo
      const links = [...document.querySelectorAll('a[href*="/game/"]')].map((a) => (a.getAttribute('href') || '').match(GAME_RE)).filter(Boolean);
      if (links.length) { const l = links[links.length - 1]; id = l[2]; type = l[1] || 'live'; }
    }
    const users = [];
    const add = (name) => { name = (name || '').trim().toLowerCase(); if (/^[a-z0-9_-]{3,25}$/.test(name) && !users.includes(name)) users.push(name); };
    document.querySelectorAll('[data-test-element="user-tagline-username"], .user-tagline-username, .cc-user-username-component').forEach((el) => add(el.textContent));
    document.querySelectorAll('.board-layout-top a[href*="/member/"], .board-layout-bottom a[href*="/member/"], [class*="player"] a[href*="/member/"]').forEach((a) => add((a.getAttribute('href').match(/\/member\/([\w-]+)/) || [])[1]));
    return { id, type, users: users.slice(0, 6), url: location.href };
  }

  function boardEl() {
    return document.querySelector('wc-chess-board, chess-board, #board-layout-chessboard, .board');
  }
  function hasBoard() { return !!boardEl(); }
  // Ignora o menu lateral do site (fica à esquerda do tabuleiro); aceita o painel da partida
  function nearBoard(el) {
    const b = boardEl();
    if (!b) return false;
    const br = b.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    return r.right > br.left + 20;
  }

  function makeButton(base) {
    const b = document.createElement('button');
    b.type = 'button';
    // Herda as classes do botão vizinho para combinar com o visual da página
    b.className = (base ? base.className + ' ' : 'lc-plain ') + 'lc-review-btn';
    b.innerHTML = '<span class="lc-knight">♞</span><span>Revisão Lance Certo</span>';
    b.title = 'Revisão gratuita e ilimitada, rodando no seu navegador';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openReview(); }, true);
    return b;
  }

  function inject() {
    if (!hasBoard()) { document.querySelector('.lc-float')?.remove(); return; }
    let injected = !!document.querySelector('.lc-review-btn:not(.lc-float)');
    for (const el of document.querySelectorAll('button, a')) {
      if (el.dataset.lcSeen || el.classList.contains('lc-review-btn')) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text || text.length > 40 || !LABEL_RE.test(text)) continue;
      if (el.closest('#lc-overlay') || !nearBoard(el)) continue;
      el.dataset.lcSeen = '1';
      el.parentNode.insertBefore(makeButton(el), el);
      injected = true;
    }
    // Botão flutuante em qualquer página com tabuleiro (inclusive /play/online após a partida),
    // caso o botão de revisão do site não seja encontrado
    const floating = document.querySelector('.lc-float');
    if (!injected && !floating) {
      const b = makeButton(null);
      b.classList.add('lc-float');
      document.body.append(b);
    } else if (floating && injected) floating.remove();
  }

  // Área a cobrir: tabuleiro (com barras dos jogadores) + coluna direita
  function targetArea() {
    const main = document.querySelector('#board-layout-main, .board-layout-main') || boardEl();
    const side = document.querySelector('#board-layout-sidebar, .board-layout-sidebar');
    if (!main) return null;
    const m = main.getBoundingClientRect();
    if (m.width < 200 || m.height < 200) return null;
    // Espaço para a barra de avaliação à esquerda do tabuleiro (como no site), se houver
    const EVAL = m.left > 40 ? 30 : 0;
    let left = m.left - EVAL, top = m.top, right = m.right, bottom = m.bottom, sideW = 0, gap = 0;
    if (side) {
      const sr = side.getBoundingClientRect();
      if (sr.width > 150 && sr.left >= m.right - 5) {
        gap = Math.max(0, sr.left - m.right);
        right = sr.right;
        top = Math.min(top, sr.top);
        bottom = Math.max(bottom, sr.bottom);
        sideW = sr.width;
      }
    }
    if (!sideW) { sideW = Math.min(420, Math.max(320, window.innerWidth - right - 24)); gap = 16; right = Math.min(window.innerWidth - 8, right + gap + sideW); }
    return { left, top, width: right - left, height: Math.max(bottom - top, 480), layout: { mainW: Math.round(m.width + EVAL), sideW: Math.round(right - m.right - gap), gap: Math.round(gap) } };
  }

  let posTimer = null, lastLayout = '';
  function place() {
    const ov = document.getElementById('lc-overlay');
    if (!ov) return;
    const a = targetArea();
    if (!a || window.innerWidth < 760) {
      ov.classList.add('lc-full');
      ov.removeAttribute('style');
      return;
    }
    ov.classList.remove('lc-full');
    Object.assign(ov.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
    const key = JSON.stringify(a.layout);
    if (key !== lastLayout) {
      lastLayout = key;
      ov.querySelector('iframe')?.contentWindow?.postMessage({ type: 'lc-layout', layout: a.layout }, EXT_ORIGIN);
    }
  }

  function openReview() {
    if (document.getElementById('lc-overlay')) return;
    const info = gameInfo();
    const a = targetArea();
    info.layout = a ? a.layout : null;
    lastLayout = JSON.stringify(info.layout);
    const ov = document.createElement('div');
    ov.id = 'lc-overlay';
    const fr = document.createElement('iframe');
    fr.src = chrome.runtime.getURL('review.html') + '#' + encodeURIComponent(JSON.stringify(info));
    fr.allow = 'clipboard-write';
    ov.append(fr);
    document.documentElement.append(ov);
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    posTimer = setInterval(place, 500);
    fr.focus();
  }

  function closeReview() {
    document.getElementById('lc-overlay')?.remove();
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    clearInterval(posTimer);
  }

  // Clique no ícone da extensão: abre o painel sobre a página
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (msg && msg.type === 'lc-open') { openReview(); reply({ ok: true }); }
  });

  window.addEventListener('message', (e) => {
    if (e.origin === EXT_ORIGIN && e.data && e.data.type === 'lc-close') closeReview();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReview(); });

  let t = null;
  const schedule = () => { clearTimeout(t); t = setTimeout(inject, 300); };
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', schedule);
  inject();
})();
