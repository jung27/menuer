export const sensationLabels = {
  spicy: "매운맛",
  sweet: "단맛",
  salty: "짠맛",
  oily: "기름짐",
  soupy: "국물",
  crispy: "바삭함",
} as const;

export type Sensation = keyof typeof sensationLabels;
export type SensationValues = Record<Sensation, number>;
export const sensationKeys = Object.keys(sensationLabels) as Sensation[];

type Menu = { menuId: string; name: string; sensations: SensationValues };

// MVP용 주관적 예시 값(0~100)입니다. 실제 조리법에 따라 달라지므로 팀 검토가 필요합니다.
// 사용자 비율과 달리 메뉴 속성의 합계는 100일 필요가 없습니다.
const menus: Menu[] = [
  { menuId: "tonkatsu", name: "돈가스", sensations: { spicy: 0, sweet: 20, salty: 45, oily: 75, soupy: 0, crispy: 95 } },
  { menuId: "fried-chicken", name: "후라이드치킨", sensations: { spicy: 10, sweet: 5, salty: 65, oily: 90, soupy: 0, crispy: 90 } },
  { menuId: "tteokbokki", name: "떡볶이", sensations: { spicy: 85, sweet: 70, salty: 50, oily: 20, soupy: 30, crispy: 0 } },
  { menuId: "jjamppong", name: "짬뽕", sensations: { spicy: 80, sweet: 10, salty: 70, oily: 45, soupy: 95, crispy: 0 } },
  { menuId: "malatang", name: "마라탕", sensations: { spicy: 95, sweet: 5, salty: 65, oily: 65, soupy: 90, crispy: 0 } },
  { menuId: "udon", name: "우동", sensations: { spicy: 0, sweet: 15, salty: 55, oily: 10, soupy: 100, crispy: 0 } },
  { menuId: "gukbap", name: "국밥", sensations: { spicy: 5, sweet: 0, salty: 35, oily: 40, soupy: 100, crispy: 0 } },
  { menuId: "soy-chicken", name: "간장치킨", sensations: { spicy: 5, sweet: 60, salty: 85, oily: 80, soupy: 0, crispy: 65 } },
  { menuId: "tangsuyuk", name: "탕수육", sensations: { spicy: 0, sweet: 90, salty: 30, oily: 70, soupy: 0, crispy: 75 } },
  { menuId: "samgyeopsal", name: "삼겹살", sensations: { spicy: 0, sweet: 0, salty: 25, oily: 100, soupy: 0, crispy: 30 } },
];

export function recommendMenus(ratios: SensationValues) {
  return menus.map((menu) => {
    const contributions = sensationKeys.map((key) => ({
      key,
      value: ratios[key] * menu.sensations[key],
    })).sort((a, b) => b.value - a.value);
    const score = contributions.reduce((sum, item) => sum + item.value, 0);
    const matchedSensations = contributions.filter((item) => item.value > 0)
      .slice(0, 2).map((item) => item.key);
    return {
      menuId: menu.menuId,
      name: menu.name,
      score,
      matchedSensations,
      reason: matchedSensations.length
        ? `${matchedSensations.map((key) => sensationLabels[key]).join("·")} 관심 비율과 메뉴 특성을 반영했어요.`
        : "선택한 감각과 일치하는 특성이 적은 메뉴예요.",
    };
  }).sort((a, b) => b.score - a.score || a.menuId.localeCompare(b.menuId))
    .slice(0, 3).map((menu, index) => ({ ...menu, rank: index + 1, score: Math.round(menu.score * 100) / 100 }));
}
