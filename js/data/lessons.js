// Conteúdo das aulas.
// Tipos de etapa:
//  info  – texto explicativo, opcionalmente com posição, destaques (highlight) e setas (arrows)
//  find  – clique nas casas pedidas (targets, em sequência)
//  stars – mova suas peças até visitar todas as estrelas (targets); sem alvos, capture todas as peças adversárias
//  move  – encontre o lance. moves: lances em UCI alternando você/adversário; alternativas separadas por "|".
//          goal: 'mate' aceita qualquer xeque-mate no último lance. pre: lance do adversário antes do exercício.
//  play  – jogue contra o computador até cumprir goal ('mate' ou 'promote').

export const COURSES = [
  {
    id: 'fundamentos',
    title: 'Primeiros passos',
    level: 'Iniciante',
    icon: '♙',
    description: 'O tabuleiro, como cada peça se move, xeque, xeque-mate e as regras especiais.',
    lessons: [
      {
        id: 'tabuleiro',
        title: 'O tabuleiro',
        summary: 'Casas, colunas, fileiras e como dar nome a cada casa.',
        steps: [
          { type: 'info', text: 'O tabuleiro tem 64 casas, alternando claras e escuras. Ele sempre é posicionado com uma **casa clara no canto inferior direito** de cada jogador.', fen: '8/8/8/8/8/8/8/8 w - - 0 1', highlight: ['h1', 'a8'] },
          { type: 'info', text: 'As linhas verticais são as **colunas**, nomeadas de **a** até **h**. As linhas horizontais são as **fileiras**, numeradas de **1** a **8**. Aqui está destacada a coluna **e**.', fen: '8/8/8/8/8/8/8/8 w - - 0 1', highlight: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8'] },
          { type: 'info', text: 'Cada casa tem um nome: a coluna seguida da fileira. Esta casa é a **e4**, onde a coluna "e" cruza a fileira "4".', fen: '8/8/8/8/8/8/8/8 w - - 0 1', highlight: ['e4'] },
          { type: 'find', text: 'Sua vez: clique nas casas pedidas.', targets: ['e4', 'a1', 'h8', 'd5', 'c7', 'f2'] },
          { type: 'info', text: 'Na posição inicial, as brancas ocupam as fileiras 1 e 2 e as pretas as fileiras 7 e 8. As brancas sempre começam. Repare que a **dama fica na casa da sua cor**: dama branca em d1 (clara), dama preta em d8 (escura).', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', highlight: ['d1', 'd8'] },
        ],
      },
      {
        id: 'torre',
        title: 'A torre',
        summary: 'Anda em linha reta, quantas casas quiser.',
        steps: [
          { type: 'info', text: 'A **torre** anda em linha reta: na vertical ou na horizontal, quantas casas quiser, desde que o caminho esteja livre.', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4']] },
          { type: 'stars', text: 'Leve a torre até todas as estrelas.', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', targets: ['a5', 'e5', 'e8'] },
          { type: 'stars', text: 'Mais estrelas! Pense no caminho mais curto.', fen: '8/8/8/8/8/8/8/7R w - - 0 1', targets: ['h7', 'b7', 'b2', 'g2'] },
        ],
      },
      {
        id: 'bispo',
        title: 'O bispo',
        summary: 'Anda nas diagonais e nunca muda a cor da casa.',
        steps: [
          { type: 'info', text: 'O **bispo** anda nas diagonais, quantas casas quiser. Um bispo que começa numa casa escura ficará **sempre** em casas escuras.', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', arrows: [['d4', 'a7'], ['d4', 'h8'], ['d4', 'a1'], ['d4', 'g1']] },
          { type: 'stars', text: 'Leve o bispo até as estrelas.', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', targets: ['e3', 'h6', 'f8'] },
          { type: 'stars', text: 'Agora com o bispo das casas claras.', fen: '8/8/8/8/8/8/8/5B2 w - - 0 1', targets: ['b5', 'e8', 'h5', 'd1'] },
        ],
      },
      {
        id: 'dama',
        title: 'A dama',
        summary: 'Torre + bispo: a peça mais poderosa.',
        steps: [
          { type: 'info', text: 'A **dama** combina a torre e o bispo: anda em linha reta **e** nas diagonais, quantas casas quiser. É a peça mais forte do jogo.', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', arrows: [['d4', 'd8'], ['d4', 'h4'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'a7'], ['d4', 'h8'], ['d4', 'a1'], ['d4', 'g1']] },
          { type: 'stars', text: 'Recolha todas as estrelas com a dama.', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', targets: ['d5', 'g8', 'a2', 'h2'] },
        ],
      },
      {
        id: 'rei',
        title: 'O rei',
        summary: 'A peça mais importante anda só uma casa.',
        steps: [
          { type: 'info', text: 'O **rei** anda uma casa em qualquer direção. Ele é a peça mais importante: se o rei for capturado de forma inevitável (xeque-mate), a partida acaba.', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', highlight: ['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5'] },
          { type: 'stars', text: 'Leve o rei até as estrelas.', fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', targets: ['e3', 'd4', 'e5', 'f4'] },
        ],
      },
      {
        id: 'cavalo',
        title: 'O cavalo',
        summary: 'Anda em "L" e pode pular outras peças.',
        steps: [
          { type: 'info', text: 'O **cavalo** anda em "L": duas casas numa direção e uma para o lado. É a única peça que **pula** por cima das outras. A cada salto, ele troca a cor da casa.', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', highlight: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'] },
          { type: 'stars', text: 'Salte com o cavalo até as estrelas.', fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', targets: ['c3', 'd5', 'f6', 'h7'] },
          { type: 'stars', text: 'O cavalo pula por cima dos peões. Pegue as estrelas!', fen: '8/8/8/8/8/8/PPPPPPPP/1N4N1 w - - 0 1', targets: ['c3', 'f3', 'e4', 'd5'] },
        ],
      },
      {
        id: 'peao',
        title: 'O peão',
        summary: 'Avança para a frente e captura na diagonal.',
        steps: [
          { type: 'info', text: 'O **peão** anda uma casa para a frente. No seu **primeiro lance**, pode avançar duas casas. Ele nunca anda para trás.', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', arrows: [['e2', 'e3'], ['e2', 'e4']] },
          { type: 'stars', text: 'Avance o peão até as estrelas.', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', targets: ['e4', 'e6'] },
          { type: 'info', text: 'O peão **captura na diagonal**, uma casa para a frente. Ele não consegue capturar a peça que está bem à sua frente.', fen: '8/8/8/3p1n2/4P3/8/8/8 w - - 0 1', arrows: [['e4', 'd5', 'red'], ['e4', 'f5', 'red']] },
          { type: 'stars', text: 'Capture todas as peças pretas com seus peões.', fen: '8/8/8/8/3p1p2/4P3/6P1/8 w - - 0 1' },
          { type: 'info', text: 'Quando um peão chega à última fileira, ele é **promovido**: vira dama, torre, bispo ou cavalo. Quase sempre escolhemos a dama.', fen: 'k7/4P3/8/8/8/8/8/7K w - - 0 1', arrows: [['e7', 'e8']] },
          { type: 'move', text: 'Promova o peão a dama.', fen: 'k7/4P3/8/8/8/8/8/7K w - - 0 1', moves: ['e7e8q'], success: 'Uma nova dama! E ainda dá xeque.' },
        ],
      },
      {
        id: 'capturas',
        title: 'Capturas e valor das peças',
        summary: 'Como capturar e quanto vale cada peça.',
        steps: [
          { type: 'info', text: 'Para **capturar**, mova sua peça para a casa ocupada por uma peça adversária. A peça capturada sai do tabuleiro. Todas as peças capturam do jeito que andam, exceto o peão.' },
          { type: 'stars', text: 'Capture todas as peças pretas com a torre.', fen: '8/1p4n1/8/8/1R2b3/8/8/8 w - - 0 1' },
          { type: 'stars', text: 'Agora com a dama: capture tudo!', fen: '8/1r3b2/8/3n4/8/1p3p2/8/3Q4 w - - 0 1' },
          { type: 'info', text: 'Valor aproximado das peças:\n\n• Peão = **1**\n• Cavalo = **3**\n• Bispo = **3**\n• Torre = **5**\n• Dama = **9**\n• Rei = não tem preço: perdê-lo é perder a partida.\n\nUse esses números para decidir se uma troca é boa.', fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
          { type: 'move', text: 'Você pode capturar a torre ou o cavalo, mas não os dois. Qual vale mais?', fen: 'k7/8/8/2n1r3/3P4/8/8/K7 w - - 0 1', moves: ['d4e5'], wrong: { d4c5: 'O cavalo vale 3; a torre vale 5. Capture a peça mais valiosa!' }, success: 'Isso! A torre (5) vale mais que o cavalo (3).' },
        ],
      },
      {
        id: 'xeque',
        title: 'Xeque',
        summary: 'O rei atacado e as três maneiras de se defender.',
        steps: [
          { type: 'info', text: 'Quando o rei é atacado, dizemos que ele está em **xeque**. Você é obrigado a sair do xeque imediatamente, de uma destas formas:\n\n1. **Mover** o rei para uma casa segura;\n2. **Bloquear** o ataque colocando uma peça no caminho;\n3. **Capturar** a peça que dá o xeque.', fen: '4r2k/8/8/8/8/8/8/4K3 w - - 0 1', arrows: [['e8', 'e1', 'red']] },
          { type: 'move', text: 'Seu rei está em xeque. Fuja movendo o rei para uma casa segura.', fen: '4r2k/8/8/8/8/8/8/4K3 w - - 0 1', moves: ['e1d1|e1d2|e1f1|e1f2'], success: 'Isso! O rei saiu da linha da torre.' },
          { type: 'move', text: 'Bloqueie o xeque colocando o bispo no caminho da torre.', fen: '7k/8/8/8/8/5B2/8/r3K3 w - - 0 1', moves: ['f3d1'], success: 'Bloqueio perfeito: o bispo protege o rei.' },
          { type: 'move', text: 'A dama preta deu xeque, mas está desprotegida. Capture-a com o rei!', fen: '7k/8/8/8/8/8/3q4/4K3 w - - 0 1', moves: ['e1d2'], success: 'O rei também captura!' },
          { type: 'move', text: 'Agora é você quem ataca: dê xeque no rei preto com a torre.', fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', moves: ['a1a8'], success: 'Xeque! O rei preto terá de se defender.' },
        ],
      },
      {
        id: 'mate',
        title: 'Xeque-mate e afogamento',
        summary: 'Como vencer uma partida e como não deixar empatar.',
        steps: [
          { type: 'info', text: '**Xeque-mate** é um xeque do qual não há como escapar: o rei não pode fugir, ninguém pode bloquear e ninguém pode capturar o atacante. Quem dá xeque-mate **vence a partida**.', fen: 'R5k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', highlight: ['g8'], arrows: [['a8', 'f8', 'red']] },
          { type: 'move', text: 'Dê xeque-mate em um lance.', fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', moves: ['a1a8'], goal: 'mate', success: 'Xeque-mate! Os próprios peões prendem o rei preto.' },
          { type: 'move', text: 'Dê xeque-mate com a dama. O seu rei ajuda!', fen: 'k7/8/1K6/8/8/8/7Q/8 w - - 0 1', moves: ['h2h8'], goal: 'mate', success: 'Mate! O rei branco tira as casas de fuga.' },
          { type: 'info', text: 'Cuidado com o **afogamento**: quando o lado que joga **não está em xeque** mas **não tem nenhum lance legal**, a partida termina **empatada**. Aqui as pretas jogam e não têm lances: é empate!', fen: 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', highlight: ['a8'] },
          { type: 'move', text: 'Você tem dama e rei contra rei. Dê mate — e não afogue!', fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1', moves: ['b1b7'], goal: 'mate', success: 'Mate com a dama protegida pelo rei.' },
        ],
      },
      {
        id: 'roque',
        title: 'O roque',
        summary: 'O lance especial que protege o rei.',
        steps: [
          { type: 'info', text: 'O **roque** é um lance especial do rei e da torre ao mesmo tempo: o rei anda **duas casas** em direção à torre, e a torre pula para o outro lado do rei.\n\nCondições: rei e torre ainda não se moveram; não há peças entre eles; o rei não está em xeque e não passa por casa atacada.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1', 'blue']] },
          { type: 'move', text: 'Faça o roque pequeno (para o lado do rei). Mova o rei duas casas para a direita.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', moves: ['e1g1'], success: 'Roque pequeno: O-O.' },
          { type: 'move', text: 'Agora o roque grande (para o lado da dama).', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', moves: ['e1c1'], success: 'Roque grande: O-O-O.' },
          { type: 'move', text: 'O bispo preto ataca f1, então o roque pequeno é proibido. Faça o roque permitido.', fen: 'r3k2r/pppppppp/b7/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 1', moves: ['e1c1'], success: 'Correto! O rei não pode passar por uma casa atacada.' },
        ],
      },
      {
        id: 'en-passant',
        title: 'En passant',
        summary: 'A captura especial de peão.',
        steps: [
          { type: 'info', text: 'Se um peão avança **duas casas** e para ao lado de um peão adversário, este pode capturá-lo **como se ele tivesse andado só uma casa**. Isso se chama **en passant** ("de passagem") e só vale no lance imediatamente seguinte.', fen: 'k7/8/8/3pP3/8/8/8/K7 w - d6 0 1', arrows: [['e5', 'd6']] },
          { type: 'move', text: 'As pretas acabaram de avançar o peão duas casas. Capture en passant!', fen: 'k7/3p4/8/4P3/8/8/8/K7 b - - 0 1', pre: 'd7d5', moves: ['e5d6'], success: 'En passant! O peão preto foi capturado.' },
        ],
      },
    ],
  },
  {
    id: 'taticas',
    title: 'Táticas essenciais',
    level: 'Intermediário',
    icon: '♘',
    description: 'Garfo, cravada, espeto, ataque descoberto e xeque duplo.',
    lessons: [
      {
        id: 'garfo',
        title: 'Garfo',
        summary: 'Uma peça atacando duas ao mesmo tempo.',
        steps: [
          { type: 'info', text: 'Um **garfo** acontece quando uma peça ataca **duas ou mais** peças adversárias ao mesmo tempo. O adversário só consegue salvar uma delas. O cavalo é especialista em garfos!', fen: 'q3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', arrows: [['c7', 'e8', 'red'], ['c7', 'a8', 'red']] },
          { type: 'move', text: 'Encontre o garfo do cavalo que ganha a dama.', fen: 'q3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', moves: ['b5c7', 'e8d7', 'c7a8'], success: 'Garfo de cavalo: xeque no rei e dama capturada!' },
          { type: 'move', text: 'Peões também dão garfos. Ataque as duas peças pretas de uma vez.', fen: 'k7/8/8/2r1n3/8/3P4/8/K7 w - - 0 1', moves: ['d3d4'], success: 'O peão ataca a torre e o cavalo. Uma delas vai cair.' },
          { type: 'move', text: 'Use a dama para dar xeque e atacar a torre ao mesmo tempo.', fen: 'k7/8/8/8/8/8/K7/3Q3r w - - 0 1', moves: ['d1d5', 'a8b8|a8a7', 'd5h1'], success: 'Garfo de dama! Xeque e depois a torre.' },
        ],
      },
      {
        id: 'cravada',
        title: 'Cravada',
        summary: 'Prender uma peça na frente de outra mais valiosa.',
        steps: [
          { type: 'info', text: 'Na **cravada**, uma peça é atacada e não pode (ou não deve) sair do lugar, porque exporia uma peça mais valiosa atrás dela. Se atrás está o **rei**, a peça cravada nem pode se mover legalmente.', fen: '4k3/8/2n5/1B6/8/8/8/4K3 w - - 0 1', arrows: [['b5', 'e8', 'red']] },
          { type: 'move', text: 'Crave o cavalo preto contra o rei.', fen: '4k3/8/2n5/8/8/8/8/3BK3 w - - 0 1', moves: ['d1a4'], success: 'Cravada! O cavalo não pode se mexer.' },
          { type: 'move', text: 'O cavalo está cravado. Ataque-o com um peão!', fen: '4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1', moves: ['d4d5'], success: 'O cavalo cravado não pode fugir: ele será capturado.' },
        ],
      },
      {
        id: 'espeto',
        title: 'Espeto',
        summary: 'A cravada ao contrário.',
        steps: [
          { type: 'info', text: 'O **espeto** é o contrário da cravada: você ataca uma peça valiosa (como o rei) que, ao sair do caminho, deixa exposta a peça que está atrás dela.', fen: '8/8/8/R3k2q/8/8/8/6K1 b - - 0 1', arrows: [['a5', 'h5', 'red']] },
          { type: 'move', text: 'Dê um xeque que espeta o rei e a dama.', fen: '8/8/8/4k2q/8/8/8/R5K1 w - - 0 1', moves: ['a1a5', 'e5e6|e5d6|e5d4|e5e4|e5f4|e5f6', 'a5h5'], success: 'Espeto! O rei sai e a dama cai.' },
        ],
      },
      {
        id: 'descoberto',
        title: 'Ataque descoberto e xeque duplo',
        summary: 'Mova uma peça para liberar o ataque de outra.',
        steps: [
          { type: 'info', text: 'No **ataque descoberto**, você move uma peça e libera a linha de outra peça sua. Se o ataque liberado for no rei, é um **xeque descoberto**: a peça que se moveu fica livre para fazer o que quiser.', fen: '4k3/8/8/8/4N3/2q5/8/4R1K1 w - - 0 1', arrows: [['e1', 'e8', 'red']] },
          { type: 'move', text: 'Capture a dama com xeque descoberto.', fen: '4k3/8/8/8/4N3/2q5/8/4R1K1 w - - 0 1', moves: ['e4c3'], success: 'O cavalo pegou a dama e a torre deu xeque: as pretas não podem recapturar.' },
          { type: 'info', text: 'No **xeque duplo**, duas peças dão xeque ao mesmo tempo. Não dá para bloquear nem capturar as duas: o rei é **obrigado a se mover**.' },
          { type: 'move', text: 'Dê um xeque duplo.', fen: '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1', moves: ['e4d6|e4f6'], success: 'Xeque duplo: torre e cavalo atacam o rei.' },
        ],
      },
    ],
  },
  {
    id: 'mates',
    title: 'Padrões de mate',
    level: 'Intermediário',
    icon: '♛',
    description: 'Os mates clássicos que aparecem em todas as partidas.',
    lessons: [
      {
        id: 'corredor',
        title: 'Mate do corredor',
        summary: 'O rei preso atrás dos próprios peões.',
        steps: [
          { type: 'info', text: 'O **mate do corredor** acontece quando o rei está preso na última fileira pelos próprios peões, e uma torre ou dama invade essa fileira.', fen: '3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', arrows: [['d8', 'g8', 'red']] },
          { type: 'move', text: 'Dê mate no corredor.', fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: ['d1d8'], goal: 'mate', success: 'Mate do corredor!' },
          { type: 'move', text: 'A torre preta vigia a última fileira. Elimine o defensor... com mate!', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', moves: ['d1d8'], goal: 'mate', success: 'Capturando o defensor, o mate do corredor funciona.' },
        ],
      },
      {
        id: 'escada',
        title: 'Mate da escada',
        summary: 'Duas torres empurrando o rei para a borda.',
        steps: [
          { type: 'info', text: 'Com duas torres, uma corta o rei numa fileira enquanto a outra dá xeque na fileira seguinte. Elas se revezam, como degraus de uma escada, até o rei chegar à borda.', fen: '8/8/6k1/R7/8/8/8/1R4K1 w - - 0 1', arrows: [['a5', 'h5', 'blue'], ['b1', 'b6']] },
          { type: 'move', text: 'Comece a escada: dê xeque na 6ª fileira.', fen: '8/8/6k1/R7/8/8/8/1R4K1 w - - 0 1', moves: ['b1b6', 'g6g7', 'a5a7', 'g7f8', 'b6b8'], goal: 'mate', success: 'Mate da escada!' },
          { type: 'play', text: 'Agora sem ajuda: dê mate com as duas torres contra o computador.', fen: '8/8/8/3k4/8/8/8/R6R w - - 0 1', goal: 'mate', success: 'Excelente! Você domina o mate com duas torres.' },
        ],
      },
      {
        id: 'sufocado',
        title: 'Mate sufocado',
        summary: 'O cavalo contra um rei cercado pelas próprias peças.',
        steps: [
          { type: 'info', text: 'No **mate sufocado**, o rei está completamente cercado pelas próprias peças, e um cavalo dá o xeque. Como o cavalo pula, não há como bloquear!' },
          { type: 'move', text: 'Dê o mate sufocado.', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', moves: ['g5f7'], goal: 'mate', success: 'Mate sufocado!' },
          { type: 'move', text: 'A combinação clássica: sacrifique a dama para sufocar o rei. (Mate em 2)', fen: '5r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1', moves: ['d5g8', 'f8g8', 'h6f7'], goal: 'mate', success: 'O sacrifício de dama força o mate sufocado!' },
        ],
      },
      {
        id: 'dama-rei',
        title: 'Mate com dama e rei',
        summary: 'O final básico que todo jogador precisa saber.',
        steps: [
          { type: 'info', text: 'Técnica: use a dama para **encolher** a caixa onde o rei adversário pode andar, sempre a um salto de cavalo de distância. Depois traga o seu rei para ajudar no mate. **Cuidado para não afogar!**' },
          { type: 'play', text: 'Agora dê o mate contra o computador.', fen: '8/8/4k3/8/8/8/8/3QK3 w - - 0 1', goal: 'mate', success: 'Mate com dama e rei! Técnica dominada.' },
        ],
      },
      {
        id: 'torre-rei',
        title: 'Mate com torre e rei',
        summary: 'Mais lento, mas igualmente forçado.',
        steps: [
          { type: 'info', text: 'Com uma torre só, o rei é indispensável. Coloque os reis em **oposição** (frente a frente, com uma casa entre eles) e dê xeque com a torre para empurrar o rei adversário uma fileira para trás. Use "lances de espera" com a torre quando precisar.', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', arrows: [['a1', 'a8']] },
          { type: 'move', text: 'Os reis estão em oposição. Dê o mate!', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', moves: ['a1a8'], goal: 'mate', success: 'Mate de torre!' },
          { type: 'play', text: 'Agora a partir do zero: dê mate com torre e rei.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', success: 'Parabéns! O mate de torre exige paciência.' },
        ],
      },
    ],
  },
  {
    id: 'aberturas',
    title: 'Princípios de abertura',
    level: 'Iniciante',
    icon: '♗',
    description: 'Centro, desenvolvimento, roque e armadilhas comuns.',
    lessons: [
      {
        id: 'centro',
        title: 'Controle o centro',
        summary: 'As quatro casas mais importantes.',
        steps: [
          { type: 'info', text: 'As casas **d4, e4, d5 e e5** formam o centro. Peças no centro alcançam mais casas e controlam o jogo. Um bom primeiro lance ocupa ou controla o centro.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', highlight: ['d4', 'e4', 'd5', 'e5'] },
          { type: 'move', text: 'Faça um primeiro lance que ocupe o centro com um peão.', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: ['e2e4|d2d4'], success: 'Ótimo! O peão central libera a dama e um bispo.' },
          { type: 'info', text: 'Compare um cavalo no centro com um na borda: em d4 ele ataca 8 casas; em a4, só 4. "Cavalo na borda, vergonha na certa!"', fen: '8/8/8/8/N2N4/8/8/8 w - - 0 1', highlight: ['b2', 'b6', 'c3', 'c5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5', 'b3', 'b5'] },
        ],
      },
      {
        id: 'desenvolvimento',
        title: 'Desenvolva as peças',
        summary: 'Cavalos e bispos para fora, rapidamente.',
        steps: [
          { type: 'info', text: 'Na abertura, coloque **cavalos e bispos** em jogo rapidamente, de preferência apontando para o centro. Evite mover a mesma peça duas vezes e não saia cedo demais com a dama: ela vira alvo.' },
          { type: 'move', text: 'Após 1.e4 e5, desenvolva uma peça menor (cavalo ou bispo).', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', moves: ['g1f3|b1c3|f1c4|f1b5'], success: 'Desenvolvimento! Cf3 ainda ataca o peão de e5.' },
          { type: 'move', text: 'As brancas atacam o peão de e5. Defenda-o desenvolvendo uma peça.', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', moves: ['b8c6|f8d6'], success: 'Defendido com desenvolvimento. (Cc6 é o mais comum: o bispo em d6 bloquearia o peão d.)' },
        ],
      },
      {
        id: 'roque-cedo',
        title: 'Rei em segurança',
        summary: 'Faça o roque cedo.',
        steps: [
          { type: 'info', text: 'Depois de desenvolver o lado do rei, faça o **roque**. O rei fica protegido atrás dos peões e a torre entra em jogo.' },
          { type: 'move', text: 'Peças desenvolvidas. Coloque o rei em segurança!', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5', moves: ['e1g1'], success: 'Rei seguro, torre ativa.' },
        ],
      },
      {
        id: 'pastor',
        title: 'Armadilha: mate do pastor',
        summary: 'Aprenda a aplicá-lo e, principalmente, a evitá-lo.',
        steps: [
          { type: 'info', text: 'A casa **f7** (e f2, para as brancas) é a mais fraca no início: só o rei a defende. O "mate do pastor" usa dama e bispo para atacá-la.', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', arrows: [['h5', 'f7', 'red'], ['c4', 'f7', 'red']] },
          { type: 'move', text: 'Você está de pretas. A dama e o bispo ameaçam mate em f7. Defenda!', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', moves: ['g7g6|d8e7|d8f6'], wrong: { g8f6: 'Cf6 ataca a dama mas não defende f7: Dxf7 é mate!' }, success: 'Defendido! Se a dama recuar, ...Cf6 ganha tempo atacando-a.' },
          { type: 'move', text: 'Agora de brancas: as pretas jogaram ...Cf6?? Aplique o mate.', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', moves: ['h5f7'], goal: 'mate', success: 'Mate do pastor. Agora você sabe evitá-lo!' },
        ],
      },
    ],
  },
  {
    id: 'finais',
    title: 'Finais de peões',
    level: 'Intermediário',
    icon: '♔',
    description: 'Regra do quadrado, oposição e promoção.',
    lessons: [
      {
        id: 'quadrado',
        title: 'A regra do quadrado',
        summary: 'O rei alcança o peão?',
        steps: [
          { type: 'info', text: 'Desenhe um quadrado do peão até a casa de promoção. Se o rei adversário **consegue entrar no quadrado** na sua vez, ele alcança o peão. Se não, o peão promove.', fen: '8/8/8/1P6/8/8/6k1/K7 w - - 0 1', highlight: ['b5', 'b6', 'b7', 'b8', 'c5', 'c6', 'c7', 'c8', 'd5', 'd6', 'd7', 'd8', 'e5', 'e6', 'e7', 'e8'] },
          { type: 'play', text: 'O rei preto está fora do quadrado. Corra com o peão e promova!', fen: '8/8/8/1P6/8/8/6k1/K7 w - - 0 1', goal: 'promote', success: 'Promoção garantida!' },
        ],
      },
      {
        id: 'oposicao',
        title: 'Oposição',
        summary: 'Rei e peão contra rei.',
        steps: [
          { type: 'info', text: 'Dois reis estão em **oposição** quando ficam frente a frente com uma casa entre eles. Quem **não** tem a vez de jogar "tem a oposição" e obriga o outro rei a ceder espaço.', fen: '8/8/4k3/8/4K3/8/8/8 w - - 0 1', highlight: ['e4', 'e6'] },
          { type: 'info', text: 'Regra prática: com rei e peão contra rei, coloque o seu **rei na frente do peão**. Andar só com o peão costuma terminar em empate.' },
          { type: 'move', text: 'Lance de brancas. Avance o rei para a frente do peão.', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', moves: ['e1d2|e1f2'], success: 'Isso, o rei lidera o caminho.' },
          { type: 'play', text: 'Agora jogue até promover. Lembre-se: rei na frente, e use a oposição!', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', goal: 'promote', success: 'Você venceu o final de rei e peão!' },
        ],
      },
    ],
  },
];

export const ALL_LESSONS = COURSES.flatMap((c) => c.lessons.map((l) => ({ ...l, course: c.id })));
