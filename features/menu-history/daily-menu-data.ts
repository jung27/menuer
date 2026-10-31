import type { DailyMenus } from "@/components/DailyRecommendations";

// UI preview data. Replace with records carrying an explicit meal type when
// the records API supports breakfast/lunch/dinner; do not infer it from time.
export const previewDailyMenus: DailyMenus[] = [
  { date: "2026-10-31", meals: { breakfast: "짜장면" } },
  { date: "2026-10-30", meals: { breakfast: "토스트", lunch: "돈카츠", dinner: "마라탕" } },
  { date: "2026-10-29", meals: { lunch: "크림 파스타", dinner: "비빔밥" } },
  { date: "2026-10-28", meals: { breakfast: "샌드위치", lunch: "우동" } },
];

export function koreaCalendarDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function prepareDailyMenus(days: readonly DailyMenus[], today?: string): DailyMenus[] {
  const grouped = new Map<string, DailyMenus>();
  for (const day of days) {
    const previous = grouped.get(day.date);
    grouped.set(day.date, { date: day.date, meals: { ...previous?.meals, ...day.meals } });
  }
  const history = [...grouped.values()]
    .filter(day => day.date !== today && Object.values(day.meals).some(Boolean))
    .sort((a, b) => b.date.localeCompare(a.date));
  return today ? [grouped.get(today) ?? { date: today, meals: {} }, ...history] : history;
}
