import type { Food } from "./taste";
import { shuffle } from "./shuffle";

const groups = {
  rice: ["비빔밥", "초밥", "김밥", "김치볶음밥", "볶음밥", "오므라이스", "카레라이스", "규동", "가츠동"],
  fried: ["치킨", "돈가스", "돈까스", "탕수육", "꿔바로우", "군만두", "닭강정"],
  meat: ["불고기", "삼겹살", "제육볶음", "찜닭", "보쌈", "족발", "수육", "마라샹궈"],
  noodles: ["짜장면", "파스타", "비빔국수", "볶음면"],
  snack: ["떡볶이", "라볶이"],
  bread: ["피자", "햄버거"],
  fresh: ["샐러드"],
} as const;

export function cardCategory(food: Food): string {
  // 국물 면까지 한 묶음으로 처리해 탕/찌개/국수만 반복되는 것도 방지합니다.
  if (food.tags["국물"] >= 0.6) return "soup";
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
  // 카테고리부터 뽑아 음식 수가 많은 국물류가 과도하게 뽑히지 않게 합니다.
  return shuffle([...buckets.values()], random).slice(0, 5)
    .map(bucket => bucket[Math.floor(random() * bucket.length)]);
}
