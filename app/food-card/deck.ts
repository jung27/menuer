import type { Food } from "./taste";
import { shuffle } from "./shuffle";

const groups = {
  soup: ["김치찌개", "된장찌개", "마라탕", "국밥", "부대찌개", "순두부찌개", "육개장", "삼계탕", "설렁탕"],
  riceNoodles: ["비빔밥", "초밥", "김밥", "볶음밥", "오므라이스", "카레라이스", "규동", "가츠동", "짜장면", "파스타", "비빔국수", "볶음면", "짬뽕", "라멘", "쌀국수", "냉면", "우동", "칼국수", "멸치국수"],
  meatFried: ["불고기", "삼겹살", "제육볶음", "찜닭", "보쌈", "족발", "치킨", "돈가스", "돈까스", "탕수육", "군만두", "닭강정"],
} as const;

export function cardCategory(food: Food): string {
  // 국물 있는 면은 밥·면, 어묵 등 분식은 그 외로 분류합니다.
  for (const [category, names] of Object.entries(groups)) {
    if ((names as readonly string[]).includes(food.name)) return category;
  }
  return "other";
}

export function createCardDeck(foods: readonly Food[], random = Math.random): Food[] {
  const buckets = new Map<string, Food[]>();
  const seen = new Set<string>();
  for (const food of foods) {
    if (seen.has(food.id)) continue;
    seen.add(food.id);
    const category = cardCategory(food);
    const bucket = buckets.get(category) ?? [];
    bucket.push(food);
    buckets.set(category, bucket);
  }
  const selected = [...buckets.values()]
    .map(bucket => bucket[Math.floor(random() * bucket.length)]);
  const selectedIds = new Set(selected.map(food => food.id));
  const remaining = [...buckets.values()].flat().filter(food => !selectedIds.has(food.id));
  // 각 분류 하나씩 확보한 뒤, 나머지 전체에서 분류 제한 없이 두 개를 추가합니다.
  return shuffle([...selected, ...shuffle(remaining, random).slice(0, 2)], random);
}
