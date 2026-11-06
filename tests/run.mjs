import { runPerft } from './perft.mjs';
import { runContent } from './content.mjs';
import { runRules } from './rules.mjs';
import { runExtension } from './extension.mjs';
let fails = 0, passes = 0;
const assert = (cond, msg) => { if (cond) passes++; else { fails++; console.error('FALHOU:', msg); } };
const suites = [['regras', runRules], ['perft', runPerft], ['conteúdo', runContent], ['extensão', runExtension]];
for (const [name, fn] of suites) {
  const t = Date.now();
  const before = fails;
  await fn(assert);
  console.log(`${name}: ${fails === before ? 'ok' : 'COM FALHAS'} (${Date.now() - t} ms)`);
}
console.log(`${passes} verificações, ${fails} falhas`);
process.exit(fails ? 1 : 0);
