import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    return nextResolve(`${specifier}.ts`, context);
  }
  return nextResolve(specifier, context);
} });
const { RECOMMENDATION_FOODS } = await import("../lib/food-catalog.ts");
const { FOOD_SOUND_GROUPS, foodSoundPattern } = await import("../lib/food-sound.ts");
const { soundForGesture } = await import("../lib/sensory-audio.ts");

const names = Object.values(FOOD_SOUND_GROUPS).flat();
assert.equal(new Set(names).size, names.length, "each food must have exactly one audio category");
assert.deepEqual([...names].sort(), RECOMMENDATION_FOODS.map(food => food.name).sort(), "audit every catalog food; fail when a new food needs mapping");
const expected = {
  broth: ["broth", "broth"], rice: ["squish", "squish"], meat: ["squish", "squish"],
  noodle: ["squish", "stretch"], tteok: ["squish", "stretch"],
  fried: ["crunch", "crunch"], bread: ["bread", "bread"], fresh: ["fresh", "fresh"],
};
for (const [category, foods] of Object.entries(FOOD_SOUND_GROUPS)) {
  for (const name of foods) {
    for (const visual of Object.keys(expected)) {
      const pattern = foodSoundPattern(name, visual);
      assert.deepEqual([soundForGesture(pattern, false), soundForGesture(pattern, true)], expected[category], `${name}: audio must survive visual material changes`);
    }
  }
  console.log(`${category}: ${foods.join(", ")} -> ${expected[category].join(" / ")}`);
}
for (const name of ["오므라이스", "김밥", "부리토"]) {
  assert.equal(foodSoundPattern(name, "rice", "broth"), "broth", "custom editor material overrides base-menu name");
}
assert.equal(foodSoundPattern("이름없는 새 음식", "fresh"), "fresh");
assert.equal(foodSoundPattern(undefined, "tteok"), "tteok");
console.log(`PASS: ${names.length} foods, press/drag, all visual overrides, custom foods and preset fallback`);
