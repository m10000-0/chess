# Extensão: Revisão Lance Certo

Adiciona um botão **"♞ Revisão Lance Certo"** logo acima do botão de revisão nas partidas **terminadas** do chess.com. O botão herda o estilo da página. Ao clicar, abre um painel por cima da página com a revisão completa:

- classificação de cada lance: **Brilhante, Ótimo, Melhor, Excelente, Bom, Teoria, Forçado, Imprecisão, Erro, Oportunidade perdida e Capivarada**;
- precisão de cada jogador, contagem por categoria e gráfico de avaliação clicável;
- tabuleiro com barra de avaliação, ícone da classificação na casa do lance e seta com o melhor lance;
- explicação de cada lance ("O melhor era…", "Havia mate em 2"), nome da abertura e botão "Próximo erro";
- navegação pelas setas do teclado; **Esc** fecha o painel.

A análise roda **no seu navegador** com o Stockfish 18 (WASM), sem limite de revisões e sem enviar nada a servidores. Se o Stockfish não carregar, a extensão usa automaticamente o motor interno do Lance Certo, que é mais fraco.

## Instalar (Chrome, Edge, Brave ou Opera)

1. Baixe o repositório (**Code → Download ZIP**) e descompacte.
2. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta `extension`.
4. Abra uma partida terminada no chess.com e clique em **♞ Revisão Lance Certo**.

O ícone da extensão na barra do navegador abre a revisão numa aba, onde você pode colar um PGN ou revisar sua última partida pelo nome de usuário.

## Como a partida é obtida

A extensão lê o número da partida na URL (ou nos links da página) e busca o PGN pela **API pública** do chess.com (`api.chess.com/pub/player/<usuário>/games/...`), usando os nomes dos jogadores mostrados na página ou o usuário salvo nas configurações. Partidas recém-terminadas podem levar alguns minutos para aparecer na API. Nesse caso, cole o PGN (Compartilhar → PGN).

A revisão **só funciona para partidas terminadas**: PGNs sem resultado são recusados, para que a extensão não sirva de ajuda durante uma partida.

## Como os lances são classificados

Para cada posição, o motor calcula a avaliação, o melhor lance e o segundo melhor (MultiPV 2). A avaliação vira **chance de vitória** (0–100%), e a perda de cada lance é a queda nessa chance:

| Perda | Classificação |
| --- | --- |
| lance do motor | Melhor |
| ≤ 2 | Excelente |
| ≤ 5 | Bom |
| ≤ 10 | Imprecisão |
| ≤ 20 | Erro |
| > 20 | Capivarada |

Casos especiais:

- **Brilhante**: um dos melhores lances que entrega material (o adversário pode capturar e ganhar 2 peões ou mais) e mantém a posição boa.
- **Ótimo**: o melhor lance, com o segundo melhor bem pior (praticamente o único lance bom).
- **Oportunidade perdida**: o adversário errou e você não aproveitou.
- **Teoria**: lances que seguem linhas conhecidas de abertura.
- **Forçado**: só havia um lance legal.

A precisão usa a fórmula de "precisão por chance de vitória" popularizada pelo Lichess.

## Licenças

O Stockfish (`stockfish/`) é software livre sob a **GPL v3** (veja `stockfish/COPYING.txt`). Versão WASM de [stockfish.js](https://github.com/nmrugg/stockfish.js), pacote npm `stockfish@18.0.8`. Esta extensão não é afiliada ao chess.com.

## Desenvolvimento

`extension/lib/` contém cópias de `js/chess.js`, `js/board.js`, `js/engine.js` e `css/style.css`. Depois de alterar esses arquivos, rode:

```bash
node tools/build-extension.mjs
```

O `npm test` falha se as cópias estiverem desatualizadas.
