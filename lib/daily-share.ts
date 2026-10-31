const mealLabels = { breakfast: "아침", lunch: "점심", dinner: "저녁" } as const;
export { mealLabels };
type Meal = keyof typeof mealLabels;
type Meals = Record<Meal, { name: string } | null>;

// 계정/추천 기록 ID 없이 공개 가능한 날짜와 음식 이름만 담습니다.
export function buildDailyShare(date: string, selectedMeals: Meals) {
  const meals = Object.fromEntries(Object.keys(mealLabels).map(key => {
    const meal = key as Meal;
    return [meal, selectedMeals[meal] ? { name: selectedMeals[meal].name } : null];
  })) as Meals;
  const selected = (Object.keys(mealLabels) as Meal[]).filter(meal => meals[meal]);
  const canShare = selected.length > 0;
  const title = `${date} 오늘의 식사`;
  const params = new URLSearchParams({ type: "day", date });
  for (const meal of selected) params.set(meal, meals[meal]!.name);
  return {
    type: "day" as const, version: 1, date, timezone: "Asia/Seoul", title,
    meals, selectedCount: selected.length, canShare,
    shareText: canShare ? [title, ...selected.map(meal => `${mealLabels[meal]}: ${meals[meal]!.name}`)].join("\n") : null,
    sharePath: canShare ? `/share?${params}` : null,
  };
}

export function parseDailyShare(params: URLSearchParams) {
  const date = params.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(time.getTime()) || time.toISOString().slice(0, 10) !== date) return null;
  const meals = Object.fromEntries((Object.keys(mealLabels) as Meal[]).map(meal => {
    const name = params.get(meal)?.trim().slice(0, 60);
    return [meal, name ? { name } : null];
  })) as Meals;
  const result = buildDailyShare(date, meals);
  return result.canShare ? result : null;
}
