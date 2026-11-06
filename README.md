# Lance Certo ♞

Escola de xadrez para treinar **sozinho**, sem depender de outros jogadores: aulas interativas, problemas táticos, desafios contra o relógio, treino de coordenadas e partidas contra o computador.

Tudo roda no navegador, sem servidor nem dependências. O progresso fica salvo no `localStorage`.

## Funcionalidades

| Seção | O que faz |
| --- | --- |
| **Aulas** | 5 cursos e 27 aulas interativas: regras e movimento das peças (com estrelas a coletar), xeque e mate, roque, en passant, táticas (garfo, cravada, espeto, ataque descoberto, xeque duplo), padrões de mate, princípios de abertura e finais de peões. Algumas etapas são jogadas contra o computador (ex.: dar mate com torre e rei). |
| **Problemas** | Problemas com solução verificada por busca exaustiva, rating Elo pessoal, filtro por tema, dicas, "ver solução" e gráfico de evolução. |
| **Contra o relógio** | Resolva problemas de dificuldade crescente em 3 ou 5 minutos (ou no modo sobrevivência). Três erros encerram a rodada. |
| **Coordenadas** | 30 segundos para clicar no maior número de casas pedidas, jogando de brancas ou de pretas. |
| **Computador** | Seis níveis (≈400 a ≈1900), escolha de cor, posição inicial via FEN, dicas, barra de avaliação, voltar lances e exportação em PGN. A partida em andamento é salva. |

## Como rodar

Por usar módulos ES e Web Workers, o site precisa ser servido por HTTP (não abre via `file://`):

```bash
npm start   # equivale a: python3 -m http.server 8080
```

Depois acesse <http://localhost:8080>.

Para publicar, basta servir a pasta como site estático (por exemplo, GitHub Pages apontando para a raiz do branch principal).

## Estrutura

```
index.html
css/style.css
js/
  chess.js          regras do xadrez: geração de lances, SAN, FEN, fim de jogo
  engine.js         motor (alfa-beta, quiescência, tabelas posicionais) e níveis
  engine-worker.js  executa o motor fora da thread principal
  solver.js         resolvedor de mate forçado (valida problemas)
  board.js          tabuleiro interativo (clique/arraste, promoção, setas, estrelas)
  views/            telas: início, aulas, problemas, contra o relógio, coordenadas, computador
  data/lessons.js   conteúdo das aulas
  data/puzzles.js   problemas gerados
tools/gen-puzzles.mjs  gerador de problemas
tests/              perft, regras e validação de todo o conteúdo
```

## Testes

```bash
npm test
```

Verifica a geração de lances com contagens *perft* de referência e regras especiais (roque, en passant, promoção, afogamento, repetição). Também valida **todo o conteúdo**: posições legais, soluções das aulas, estrelas alcançáveis e, nos problemas, que a solução é legal, termina em mate quando deveria e tem primeiro lance único.

## Gerando novos problemas

```bash
node tools/gen-puzzles.mjs 600 12345   # nº de partidas, semente
```

O gerador faz o motor jogar partidas com erros propositais e procura posições com mate forçado (em 1, 2 ou 3 lances, com solução única) ou com um golpe tático que ganha material com margem clara. Cada problema começa com o último lance do adversário, como numa partida real.
