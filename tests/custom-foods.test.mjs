import test from "node:test";
import assert from "node:assert/strict";
import { emptyCustomFood, parseCustomFood, PHYSICS_FIELDS, SURFACE_PATTERNS, TASTE_FIELDS, COLOR_PALETTE } from "../features/custom-foods/model.ts";

test("all existing taste, physics and color controls are present", () => {
  const draft = emptyCustomFood();
  assert.equal(TASTE_FIELDS.length, 6);
  assert.equal(Object.keys(PHYSICS_FIELDS).length, 13);
  assert.equal(Object.keys(draft.physics).length, 16);
  assert.equal(Object.keys(SURFACE_PATTERNS).length, 7);
  assert.equal(new Set(COLOR_PALETTE).size, 40);
});
test("valid configuration round-trips without accepting owner fields", () => {
  const draft = emptyCustomFood(); draft.name = " 바삭한 음식 "; draft.tags.바삭함 = 0.7;
  const parsed = parseCustomFood({ ...draft, userId: "someone-else" });
  assert.equal(parsed.name, "바삭한 음식");
  assert.equal(parsed.tags.바삭함, 0.7);
  assert.equal("userId" in parsed, false);
});
test("bad ranges, missing controls, invalid colors and unsafe images are rejected", () => {
  const draft = { ...emptyCustomFood(), name: "음식" };
  assert.throws(() => parseCustomFood({ ...draft, name: " " }));
  assert.throws(() => parseCustomFood({ ...draft, tags: { ...draft.tags, 매운맛: 2 } }));
  assert.throws(() => parseCustomFood({ ...draft, tags: { ...draft.tags, 짠맛: NaN } }));
  assert.throws(() => parseCustomFood({ ...draft, physics: { ...draft.physics, maxStretch: 0.2 } }));
  assert.throws(() => parseCustomFood({ ...draft, physics: { ...draft.physics, baseColor: "red" } }));
  assert.throws(() => parseCustomFood({ ...draft, physics: { ...draft.physics, pattern: "other" } }));
  assert.throws(() => parseCustomFood({ ...draft, image: "data:image/svg+xml;base64,PHN2Zz4=" }));
  assert.throws(() => parseCustomFood({ ...draft, image: "https://other.invalid/file.png" }));
});
test("surface patterns round-trip and older saved foods still load", () => {
  const draft = { ...emptyCustomFood(), name: "음식" };
  for (const pattern of Object.keys(SURFACE_PATTERNS)) {
    assert.equal(parseCustomFood({ ...draft, physics: { ...draft.physics, pattern } }).physics.pattern, pattern);
  }
  delete draft.physics.pattern;
  assert.equal(parseCustomFood(draft).physics.pattern, "meat");
});
test("reset defaults are independent objects and bounds are accepted", () => {
  const first = emptyCustomFood(), second = emptyCustomFood(); first.tags.매운맛 = 1; first.physics.squish = 1;
  assert.equal(second.tags.매운맛, 0); assert.equal(second.physics.squish, 0.5);
  second.name = "음식"; second.physics.maxStretch = 2;
  assert.equal(parseCustomFood(second).physics.maxStretch, 2);
});
