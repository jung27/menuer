"use client";

import Link from "next/link";
import ShareButton from "@/app/share/ShareButton";
import Tutorial from "@/components/Tutorial";
import DailyShareButton from "@/features/sharing/DailyShareButton";
import useShareFeedbackGroup from "@/features/sharing/useShareFeedbackGroup";
import MealIcon from "./MealIcon";

export type Meal = "breakfast" | "lunch" | "dinner";

export type DailyMenus = {
  date: string; // "2026-10-31"
  meals: Partial<Record<Meal, string>>; // 정해진 메뉴 이름. 없으면 "+ 추천" 버튼이 나옴
};

const MEALS: { key: Meal; label: string }[] = [
  { key: "breakfast", label: "아침" },
  { key: "lunch", label: "점심" },
  { key: "dinner", label: "저녁" },
];

/**
 * 날짜별 아침·점심·저녁 추천 목록. 맨 위 날짜만 펼친 채로 시작하고, 날짜를 누르면 접고 펼침.
 * editableDate에 해당하는 오늘 메뉴만 재선정 링크를 표시합니다.
 */
export default function DailyRecommendations({
  days,
  editableDate,
  recommendHref = (date, meal) => `/food-card?date=${date}&meal=${meal}`,
}: {
  days: DailyMenus[];
  editableDate?: string;
  recommendHref?: (date: string, meal: Meal) => string; // "추천" 버튼을 눌렀을 때 갈 주소
}) {
  const shareFeedback = useShareFeedbackGroup();
  return (
    <>
      {editableDate && <Tutorial step="home" text={"환영해요! 👋\n오늘 아침 메뉴부터 추천받아 볼까요?\n\n📳 진동까지 느끼고 싶다면\n갤럭시에서 크롬이나 삼성 인터넷으로 열어 주세요.\n카카오톡 안에서 열었다면 외부 브라우저로!\n아이폰은 아쉽게도 웹 진동을 지원하지 않아요."} />}
    <ul className="flex flex-col gap-3">
      {days.map((day, i) => (
        <li key={day.date}>
          <details open={i === 0} onToggle={event => {
            if (!event.currentTarget.open) shareFeedback.reset(day.date);
          }} className="group relative rounded-2xl border border-neutral-200 bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-5 font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
              {day.date}
              <span
                aria-hidden
                className="text-xl text-neutral-400 transition-transform group-open:-rotate-90"
              >
                ‹
              </span>
            </summary>
            <DailyShareButton day={day} feedback={shareFeedback.forButton(`${day.date}:day`, day.date)} />
            <ul className="flex flex-col gap-2 px-6 pb-6">
              {MEALS.map(({ key, label }) => {
                const menu = day.meals[key];
                return (
                  <li key={key} className="flex items-center gap-4">
                    <span className="flex w-10 shrink-0 flex-col items-center text-xs text-neutral-500">
                      <MealIcon meal={key} />
                      {label}
                    </span>
                    {day.date !== editableDate ? (
                      <div className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-neutral-700">{menu ?? "미선정"}</div>
                    ) : <Link
                      data-tutorial={key === "breakfast" ? "home" : undefined}
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
                      {menu && <span className="ml-auto text-xs text-neutral-500">다시 고르기</span>}
                    </Link>}
                    {menu && (
                      <ShareButton
                        menu={menu}
                        label="음식 공유"
                        feedback={shareFeedback.forButton(`${day.date}:${key}`, day.date)}
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
    </>
  );
}
