export const TAGS = ["매운맛", "단맛", "짠맛", "기름짐", "국물", "바삭함"] as const;
export type Tag = (typeof TAGS)[number];
export type Taste = Record<Tag, number>; // 각 맛 0~1
export type Food = { id: string; name: string; tags: Taste };

// 한 번에 음식 점수 쪽으로 얼마나 다가갈지 (0~1). 직접 써 보면서 조절하세요.
export const WEIGHTS = {
  tap: 0.2,
  dragPerSec: 0.1, // 잡고 있던 시간(초, 최대 3초)에 곱함
  shake: 0.3,
  swipe: -0.3, // 상호작용 없이 넘길 때만, 방향 상관없음
};

export const emptyTaste = (): Taste =>
  Object.fromEntries(TAGS.map((t) => [t, 0])) as Taste;

export function applyInteraction(taste: Taste, food: Food, weight: number): Taste {
  const next = { ...taste };
  for (const t of TAGS) {
    next[t] =
      weight >= 0
        ? taste[t] + weight * (food.tags[t] - taste[t]) // 음식 점수 쪽으로 다가감
        : taste[t] * (1 + weight * food.tags[t]); // 그 음식이 가진 맛만 줄어듦
  }
  return next;
}

// 화면 막대용: 0~100%
export const toGauge = (taste: Taste): Taste =>
  Object.fromEntries(TAGS.map((t) => [t, Math.round(taste[t] * 100)])) as Taste;

// 백엔드 전송용: 전체 중 각 맛의 비율 (합 100%)
export function toPercent(taste: Taste): Taste {
  const sum = TAGS.reduce((s, t) => s + taste[t], 0);
  return Object.fromEntries(
    TAGS.map((t) => [t, sum ? Math.round((taste[t] / sum) * 100) : 0]),
  ) as Taste;
}

function cosine(a: Taste, b: Taste) {
  let dot = 0, na = 0, nb = 0;
  for (const t of TAGS) {
    dot += a[t] * b[t];
    na += a[t] ** 2;
    nb += b[t] ** 2;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// 취향과 비슷한 순서로 음식 정렬 (score: 0~1)
export function rank(taste: Taste, foods: Food[], n = 5) {
  return foods
    .map((f) => ({ ...f, score: cosine(taste, f.tags) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
