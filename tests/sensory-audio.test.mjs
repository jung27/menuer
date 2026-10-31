import assert from "node:assert/strict";
import { SensoryAudio, soundForGesture, prepareSensoryAudio } from "../lib/sensory-audio.ts";

const sources = [];
let contexts = 0;
let finishDownload;
let fetches = 0;
let decodes = 0;
globalThis.fetch = async url => {
  fetches++;
  if (url.endsWith("stretch-touch.wav")) await new Promise(resolve => { finishDownload = resolve; });
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
};
class Context {
  state = "running";
  currentTime = 10;
  destination = {};
  constructor() { contexts++; }
  resume() { return Promise.resolve(); }
  decodeAudioData() { decodes++; return Promise.resolve({ duration: 5 }); }
  createBufferSource() {
    const source = { connect() {}, disconnect() {}, start() { this.started = true; }, stop(time) { this.stopTime = time; } };
    sources.push(source);
    return source;
  }
  createGain() {
    return { connect() {}, disconnect() {}, gain: { value: 0.3, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {} } };
  }
}
globalThis.window = { AudioContext: Context };
const flush = () => new Promise(resolve => setImmediate(resolve));
assert.equal(soundForGesture("broth", true), "broth");
assert.equal(soundForGesture("fresh", false), "fresh");
assert.equal(soundForGesture("fried", true), "crunch");
assert.equal(soundForGesture("noodle", false), "squish");
assert.equal(soundForGesture("noodle", true), "stretch");
assert.equal(soundForGesture("tteok", false), "squish");
assert.equal(soundForGesture("tteok", true), "stretch");
const audio = new SensoryAudio();
audio.preload("broth");
await flush();
assert.equal(decodes, 1, "decode before touch, not inside the first gesture");
audio.play("broth");
assert.equal(sources.length, 1, "cached touch schedules playback synchronously");
await flush();
assert.equal(sources.length, 1);
assert.equal(sources[0].loop, true);
for (let i = 0; i < 20; i++) audio.play("broth");
await flush();
assert.equal(sources.length, 1, "drag moves must not stack or restart sound");
audio.stop();
assert.equal(sources[0].stopTime, 10.085, "release fades and stops playback");
audio.play("stretch");
audio.stop(true);
finishDownload();
await flush();
assert.equal(sources.length, 1, "late loading must not play after release/unmount");
audio.play("crunch");
await flush();
assert.equal(sources[1].loop, false);
audio.play("fresh");
await flush();
assert.equal(sources[1].stopTime, 10, "switch stops the old voice immediately");
assert.equal(sources[2].loop, false);
audio.stop(true);
await prepareSensoryAudio();
const loaded = { fetches, decodes };
audio.play("squish");
assert.equal(sources.length, 4, "preloaded next card starts without awaiting a promise");
assert.deepEqual({fetches,decodes}, loaded, "warm play must not fetch or decode");
audio.stop(true);
assert.equal(contexts, 1, "reuse AudioContext across interactions");
console.log("PASS: predecoded immediate playback, no touch-time fetch/decode, gesture mapping, no stacking, fade stop, async cancellation and context reuse");
