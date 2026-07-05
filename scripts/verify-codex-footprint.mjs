/**
 * Verify worker Life Calling + Codex footprint match calculator logic.
 */
import { getCodexRoot } from '../js/codex-data.mjs';
import { buildCodexFootprintSvg, buildCodexPromptBlock } from '../js/codex-footprint.mjs';

function reduceNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33 && n !== 44) {
    n = String(n).split('').reduce((a, d) => a + parseInt(d, 10), 0);
  }
  return n;
}

function calcLifePath(month, day, year) {
  const raw = [...String(month), ...String(day), ...String(year)]
    .reduce((a, c) => a + Number(c), 0);
  return { compound: raw, root: reduceNumber(raw) };
}

function calcExpression(fullName) {
  const LETTER_VALUES = {
    A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
    J:1,K:11,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
    S:1,T:2,U:3,V:22,W:5,X:6,Y:7,Z:8,
  };
  const raw = fullName.trim().split(/\s+/).reduce((total, word) => {
    const wordSum = word.toUpperCase().replace(/[^A-Z]/g, '').split('')
      .reduce((a, c) => a + (LETTER_VALUES[c] || 0), 0);
    return total + reduceNumber(wordSum);
  }, 0);
  return { compound: raw, root: reduceNumber(raw) };
}

function workerFrequencies(name, month, day, year) {
  const lp = calcLifePath(month, day, year);
  const exp = calcExpression(name);
  const rawDestiny = parseInt(String(exp.root) + String(lp.root), 10);
  const destiny = reduceNumber(rawDestiny);
  return {
    lifePath: lp.root,
    expression: exp.root,
    destiny,
    rawLifePath: lp.compound,
    rawExpression: exp.compound,
    rawDestiny,
  };
}

const cases = [
  { name: 'Jane Doe', month: 3, day: 7, year: 1990 },
  { name: 'Test Master', month: 11, day: 29, year: 1988 },
  { name: 'Kyel Thomas', month: 7, day: 4, year: 1985 },
];

let failed = 0;
for (const c of cases) {
  const lp = calcLifePath(c.month, c.day, c.year);
  const exp = calcExpression(c.name);
  const clComp = parseInt(String(exp.root) + String(lp.root), 10);
  const calling = { compound: clComp, root: reduceNumber(clComp) };

  const worker = workerFrequencies(c.name, c.month, c.day, c.year);
  const ok =
    worker.destiny === calling.root &&
    worker.rawDestiny === calling.compound &&
    getCodexRoot(worker.lifePath) === getCodexRoot(lp.root) &&
    getCodexRoot(worker.expression) === getCodexRoot(exp.root);

  const map = buildCodexFootprintSvg(worker);
  const prompt = buildCodexPromptBlock(worker);

  console.log(`\n${c.name} (${c.month}/${c.day}/${c.year})`);
  console.log(`  Calculator Calling: ${calling.compound}/${calling.root}`);
  console.log(`  Worker Calling:     ${worker.rawDestiny}/${worker.destiny}`);
  console.log(`  Codex nodes LP/Exp/Call: ${getCodexRoot(worker.lifePath)}/${getCodexRoot(worker.expression)}/${getCodexRoot(worker.destiny)}`);
  console.log(`  SVG length: ${map.svg.length}, narrative: ${map.narrative.slice(0, 60)}...`);
  console.log(`  Prompt block lines: ${prompt.split('\n').length}`);
  console.log(`  Match: ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} case(s) failed`);
  process.exit(1);
}
console.log('\nAll cases passed.');
