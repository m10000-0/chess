// Copia os módulos compartilhados do site para a extensão (extension/lib).
import { copyFileSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
mkdirSync(new URL('extension/lib/', root), { recursive: true });
for (const [src, dst] of [['js/chess.js', 'chess.js'], ['js/board.js', 'board.js'], ['js/engine.js', 'engine.js'], ['css/style.css', 'base.css']]) {
  copyFileSync(new URL(src, root), new URL('extension/lib/' + dst, root));
}
console.log('extension/lib atualizado');
