import type { DailyMenus } from "@/components/DailyRecommendations";

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
