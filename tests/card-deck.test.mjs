import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier) ? `${specifier}.ts` : specifier, context);
} });
const { createCardDeck, cardCategory } = await import("../app/food-card/deck.ts");
const { RECOMMENDATION_FOODS } = await import("../lib/food-catalog.ts");
const { emptyCustomFood } = await import("../features/custom-foods/model.ts");
const custom = (id, name) => {
  const draft = emptyCustomFood();
  return { id: `custom:${id}`, name, tags: draft.tags, customConfig: draft.physics, image: null };
};

test("basic deck still has six distinct cards covering all categories", () => {
  const deck = createCardDeck(RECOMMENDATION_FOODS, () => 0.3);
  assert.equal(deck.length, 6);
  assert.equal(new Set(deck.map(food => food.id)).size, 6);
  assert.equal(new Set(deck.map(cardCategory)).size, 4);
});

test("every enabled custom card survives initial and restarted deck sampling", () => {
  const extras = [custom("a", "나만의 튀김"), custom("b", "짜장면")];
  extras[0].customConfig.baseColor = "#2563EB";
  extras[0].customConfig.pattern = "fried";
  extras[0].image = "data:image/png;base64,example";
  for (const random of [() => 0, () => 0.4, () => 0.999]) {
    const deck = createCardDeck([...RECOMMENDATION_FOODS, ...extras], random);
    assert.equal(deck.length, 8);
    for (const food of extras) assert.deepEqual(deck.find(item => item.id === food.id), food);
    assert.equal(new Set(deck.filter(food => !food.id.startsWith("custom:")).map(cardCategory)).size, 4);
  }
});

test("custom-only catalogs and more than six custom foods are not dropped or duplicated", () => {
  const extras = Array.from({ length: 9 }, (_, i) => custom(String(i), `내 음식 ${i}`));
  assert.equal(createCardDeck([...extras, extras[0]]).length, extras.length);
  assert.equal(createCardDeck([...RECOMMENDATION_FOODS, ...extras]).length, 6 + extras.length);
  assert.deepEqual(createCardDeck([]), []);
});
