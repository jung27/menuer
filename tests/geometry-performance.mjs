import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import * as THREE from 'three';

// Exercise the actual geometry builders without mounting React/WebGL.
const path = 'components/SensoryObject.tsx';
const current = fs.readFileSync(path, 'utf8');
const previous = execFileSync('git', ['-c', `safe.directory=${process.cwd().replaceAll('\\', '/')}`, 'show', `HEAD:${path}`], { encoding: 'utf8' });
const names = new Set(['createSculpted3DCardGeometry', 'build3DNoodleBundleCardGeometry', 'build3DRiceClusterCardGeometry', 'clipPolygonByPlane', 'buildRigidCardCrust']);
function load(source) {
  const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.has(n.name?.text)).map(n => n.getText(ast)).join('\n');
  const code = ts.transpileModule(`const CARD_WIDTH=1.62,CARD_HEIGHT=2.16,CARD_DEPTH=0.28,CARD_BEVEL=0.075;${functions}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('THREE', `${code}; return buildRigidCardCrust;`)(THREE);
}
const before = load(previous), after = load(current);
let oldMs = 0, newMs = 0;
for (const pattern of ['fried', 'bread', 'meat', 'tteok', 'fresh']) {
  const t0 = performance.now();
  const old = before(pattern, 42);
  oldMs += performance.now() - t0;
  const t1 = performance.now();
  const next = after(pattern, 42);
  newMs += performance.now() - t1;
  assert.equal(next.basePositions.length, old.basePositions.length, pattern);
  assert.deepEqual(next.vertexShardIds, old.vertexShardIds, pattern);
  for (let i = 0; i < old.basePositions.length; i++) {
    assert.ok(Math.abs(next.basePositions[i] - old.basePositions[i]) < 0.00001, `${pattern} vertex ${i}`);
  }
  old.geometry.dispose(); next.geometry.dispose();
}
console.log(`PASS: five crust patterns preserve topology/positions. Local builder timings: before=${oldMs.toFixed(1)}ms after=${newMs.toFixed(1)}ms (not a browser benchmark).`);
