import Link from "next/link";
import { mealLabels, parseDailyShare } from "@/lib/daily-share";

export default function DailyShareCard({ params }: { params: URLSearchParams }) {
  const share = parseDailyShare(params);
  if (!share) return <><p className="text-neutral-500">공유된 식사 기록을 확인해주세요.</p><Link href="/" className="underline">홈으로</Link></>;
  const icons = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" };
  return <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 sm:p-9">
    <Link href="/" className="text-sm font-semibold text-neutral-500">메뉴얼</Link>
    <p className="mt-8 text-sm text-neutral-500">공유된 하루 식사</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{share.date}</h1>
    <ul className="my-8 flex flex-col gap-3">{(Object.keys(mealLabels) as (keyof typeof mealLabels)[]).map(meal => <li key={meal} className="flex items-center gap-4 rounded-2xl border border-neutral-200 px-4 py-5">
      <span className="flex shrink-0 flex-col items-center gap-1 text-xs text-neutral-500"><span aria-hidden="true" className="text-xl">{icons[meal]}</span>{mealLabels[meal]}</span>
      <span className={`min-w-0 break-words text-lg ${share.meals[meal] ? "font-medium text-neutral-900" : "text-neutral-400"}`}>{share.meals[meal]?.name ?? "미선정"}</span>
    </li>)}</ul><Link href="/" className="block rounded-xl bg-neutral-800 px-5 py-3 text-center text-sm font-medium text-white">나도 메뉴 고르기</Link>
  </section>;
}
