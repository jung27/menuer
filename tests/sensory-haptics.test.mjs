import assert from 'node:assert/strict';
import { SensoryHaptics, HAPTIC_PATTERNS } from '../lib/sensory-haptics.ts';
const calls = [];
const pending = new Map();
let nextId = 0;
let accepted = true;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  userAgent: 'Android Samsung', vibrate: value => { calls.push(value); return accepted; },
} });
globalThis.document = { hidden: false };
globalThis.setTimeout = callback => { pending.set(++nextId, callback); return nextId; };
globalThis.clearTimeout = id => pending.delete(id);
const advance = () => {
  const [id, callback] = pending.entries().next().value;
  pending.delete(id); callback();
};
const h = new SensoryHaptics();
h.start('mouse', 'crunch');
assert.equal(calls.length, 0);
navigator.userAgent = 'iPhone';
h.start('touch', 'crunch');
assert.equal(calls.length, 0);
navigator.userAgent = 'Android';
h.start('touch', 'squish');
assert.deepEqual(calls.at(-1), HAPTIC_PATTERNS.squish.pulse);
for (let i = 0; i < 100; i++) h.setKind('stretch');
assert.equal(calls.length, 1);
assert.equal(pending.size, 1);
advance();
assert.deepEqual(calls.at(-1), HAPTIC_PATTERNS.stretch.pulse);
h.stop();
assert.equal(calls.at(-1), 0);
assert.equal(pending.size, 0);
h.start('touch', 'broth');
document.hidden = true;
advance();
assert.equal(calls.at(-1), 0);
assert.equal(pending.size, 0);
document.hidden = false;
accepted = false;
h.start('touch', 'fresh');
assert.equal(pending.size, 0);
for (const profile of Object.values(HAPTIC_PATTERNS)) {
  assert.ok(profile.pulse.reduce((a, b) => a + b, 0) < profile.interval);
}
console.log('PASS: Android touch only, paced gestures, stop/hidden cleanup, rejected vibration');
