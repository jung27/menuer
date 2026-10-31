import Link from "next/link";
import ShareButton from "@/app/share/ShareButton";

export type Meal = "breakfast" | "lunch" | "dinner";

export type DailyMenus = {
  date: string; // "2026-10-31"
  meals: Partial<Record<Meal, string>>; // 정해진 메뉴 이름. 없으면 "+ 추천" 버튼이 나옴
};

const MEALS: { key: Meal; label: string; icon: string }[] = [
  { key: "breakfast", label: "아침", icon: "🌅" },
  { key: "lunch", label: "점심", icon: "☀️" },
  { key: "dinner", label: "저녁", icon: "🌙" },
];

/**
 * 날짜별 아침·점심·저녁 추천 목록. 맨 위 날짜만 펼친 채로 시작하고, 날짜를 누르면 접고 펼침.
 *
 * 사용 예:
 * <DailyRecommendations
 *   days={[
 *     { date: "2026-10-31", meals: { breakfast: "짜장면" } },
 *     { date: "2026-10-30", meals: {} },
 *   ]}
 * />
 */
export default function DailyRecommendations({
  days,
  recommendHref = (date, meal) => `/food-card?date=${date}&meal=${meal}`,
}: {
  days: DailyMenus[];
  recommendHref?: (date: string, meal: Meal) => string; // "추천" 버튼을 눌렀을 때 갈 주소
}) {
  return (
    <ul className="flex flex-col gap-3">
      {days.map((day, i) => (
        <li key={day.date}>
          <details open={i === 0} className="group rounded-2xl border border-neutral-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
              {day.date}
              <span
                aria-hidden
                className="text-xl text-neutral-400 transition-transform group-open:-rotate-90"
              >
                ‹
              </span>
            </summary>

            <ul className="flex flex-col gap-2 px-6 pb-6">
              {MEALS.map(({ key, label, icon }) => {
                const menu = day.meals[key];
                return (
                  <li key={key} className="flex items-center gap-4">
                    <span className="flex w-10 shrink-0 flex-col items-center text-xs text-neutral-500">
                      <span aria-hidden className="text-2xl">
                        {icon}
                      </span>
                      {label}
                    </span>
                    <Link
                      href={recommendHref(day.date, key)}
                      aria-label={menu ? `${label} ${menu}, 다시 추천받기` : `${label} 메뉴 추천받기`}
                      className={`flex flex-1 items-center gap-2 rounded-xl border px-4 py-3 transition-colors ${
                        menu
                          ? "border-neutral-300 bg-neutral-50 font-medium text-neutral-900"
                          : "border-dashed border-neutral-300 text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      <span aria-hidden className="text-neutral-400">
                        {menu ? "↻" : "+"}
                      </span>
                      {menu ?? "추천"}
                    </Link>
                    {menu && (
                      <ShareButton
                        menu={menu}
                        className="shrink-0 rounded-xl border border-neutral-300 px-3 py-3 text-sm text-neutral-600 hover:bg-neutral-50"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
