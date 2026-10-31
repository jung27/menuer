import Link from "next/link";
import { mealLabels, parseDailyShare } from "@/lib/daily-share";
import { RECOMMENDATION_FOODS } from "@/lib/food-catalog";
import SharedMealPreview from "./SharedMealPreview";
import MealIcon from "@/components/MealIcon";

export default function DailyShareCard({ params }: { params: URLSearchParams }) {
  const share = parseDailyShare(params);
  if (!share) return <><p className="text-neutral-500">공유된 식사 기록을 확인해주세요.</p><Link href="/" className="underline">홈으로</Link></>;
  return <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 sm:p-9">
    <p className="text-sm text-neutral-500">공유된 하루 식사</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{share.date}</h1>
    <ul className="my-8 flex flex-col gap-3">{(Object.keys(mealLabels) as (keyof typeof mealLabels)[]).map(meal => {
      const menu = share.meals[meal]?.name;
      const food = RECOMMENDATION_FOODS.find(item => item.name === menu);
      return <li key={meal} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-2xl border border-neutral-200 px-4 py-5 sm:flex sm:gap-4">
      <span className="flex shrink-0 flex-col items-center gap-1 text-xs text-neutral-500"><MealIcon meal={meal} compact />{mealLabels[meal]}</span>
      <span className={`min-w-0 flex-1 break-words text-lg ${menu ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{menu ?? "미선정"}</span>
      {food && <SharedMealPreview food={food} mealLabel={mealLabels[meal]} />}
    </li>;
    })}</ul><Link href="/" className="block rounded-xl bg-neutral-800 px-5 py-3 text-center text-sm font-medium text-white">나도 메뉴 고르기</Link>
  </section>;
}
