// Sound describes the food, not the mesh used to draw its topping or wrapper.
// Keep base-menu coverage explicit so visual overrides cannot change audio.
export const FOOD_SOUND_GROUPS = {
  broth: ["김치찌개", "된장찌개", "마라탕", "국밥", "부대찌개", "순두부찌개", "육개장", "삼계탕", "설렁탕"],
  rice: ["비빔밥", "초밥", "김밥", "볶음밥", "오므라이스", "카레라이스", "규동", "가츠동"],
  meat: ["불고기", "삼겹살", "제육볶음", "찜닭", "보쌈", "족발", "순대", "어묵"],
  noodle: ["짜장면", "짬뽕", "라멘", "쌀국수", "냉면", "파스타", "우동", "칼국수", "멸치국수", "비빔국수", "볶음면"],
  tteok: ["떡볶이", "떡꼬치", "라볶이"],
  fried: ["치킨", "돈가스", "탕수육", "군만두", "닭강정"],
  bread: ["피자", "햄버거", "샌드위치", "토스트", "부리토"],
  fresh: ["샐러드", "포케", "월남쌈", "냉채"],
} as const;

const patterns = new Map<string, string>(Object.entries(FOOD_SOUND_GROUPS)
  .flatMap(([pattern, names]) => names.map(name => [name, pattern] as [string, string])));

export function foodSoundPattern(foodName: string | undefined, visualPattern: string, customPattern?: string): string {
  // An editor may name a custom food after a base menu; its chosen material wins.
  if (customPattern !== undefined) return customPattern;
  return (foodName && patterns.get(foodName)) || visualPattern;
}
