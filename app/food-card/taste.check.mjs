// 실행: node --experimental-strip-types app/food-card/taste.check.mjs
import assert from "node:assert";
import { applyInteraction, emptyTaste, rank, toGauge, toPercent } from "./taste.ts";

const tags = (o) => ({ 매운맛: 0, 단맛: 0, 짠맛: 0, 기름짐: 0, 국물: 0, 바삭함: 0, ...o });
const spicy = { id: "a", name: "매운거", tags: tags({ 매운맛: 0.9 }) };
const sweet = { id: "b", name: "단거", tags: tags({ 단맛: 1 }) };

// 누르면 음식 점수 쪽으로 다가감
let t = applyInteraction(emptyTaste(), spicy, 0.5);
assert.equal(t.매운맛, 0.45);

// 계속 눌러도 음식 점수(0.9)를 넘지 않고 수렴
for (let i = 0; i < 50; i++) t = applyInteraction(t, spicy, 0.5);
assert.ok(t.매운맛 <= 0.9 && t.매운맛 > 0.89);
assert.equal(toGauge(t).매운맛, 90);

// 바로 넘기면 그 음식이 가진 맛만 줄어듦
t = applyInteraction(tags({ 매운맛: 0.5, 단맛: 0.5 }), spicy, -0.5);
assert.ok(Math.abs(t.매운맛 - 0.275) < 1e-9);
assert.equal(t.단맛, 0.5);

t = tags({ 매운맛: 0.6, 단맛: 0.2 });
assert.deepEqual([toPercent(t).매운맛, toPercent(t).단맛], [75, 25]);
assert.equal(rank(t, [sweet, spicy])[0].name, "매운거");
assert.equal(toPercent(emptyTaste()).매운맛, 0); // 0으로 나누기 없음
console.log("ok");
