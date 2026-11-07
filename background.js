// Clique no ícone da extensão: abre a revisão em uma aba (colar PGN ou buscar a última partida).
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('review.html') });
});
