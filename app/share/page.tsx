import { Suspense } from "react";
import { RECOMMENDATION_FOODS } from "@/lib/food-catalog";
import ShareCard from "./ShareCard";
import DailyShareCard from "@/features/sharing/DailyShareCard";

// 공유 링크: /share?menu=짜장면&from=닉네임 (DB 없이 주소에 담긴 값만으로 그림)
export default function SharePage({ searchParams }: PageProps<"/share">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-neutral-50 p-6">
      <Suspense fallback={null}>
        <Shared searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function Shared({ searchParams }: Pick<PageProps<"/share">, "searchParams">) {
  const params = await searchParams;
  if (first(params.type) === "day") {
    const query = new URLSearchParams();
    for (const key of ["date", "breakfast", "lunch", "dinner"]) query.set(key, first(params[key]));
    return <DailyShareCard params={query} />;
  }
  const menu = first(params.menu).slice(0, 50);
  const from = first(params.from).slice(0, 30);
  const food = RECOMMENDATION_FOODS.find((f) => f.name === menu);

  if (!menu) return <p className="text-neutral-500">공유된 메뉴가 없어요.</p>;
  return <ShareCard menu={menu} from={from} food={food} />;
}
