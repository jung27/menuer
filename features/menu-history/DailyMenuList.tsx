"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import DailyRecommendations, { type DailyMenus, type Meal } from "@/components/DailyRecommendations";
type ApiDay = { date: string; meals: Record<Meal, { name: string } | null> };
const toDay = (day: ApiDay): DailyMenus => ({ date: day.date,
  meals: Object.fromEntries(Object.entries(day.meals).filter(([, value]) => value).map(([meal, value]) => [meal, value!.name])),
});
export default function DailyMenuList({ recommendationHref = "/food-card" }: { recommendationHref?: string }) {
  const [data, setData] = useState<{ today: string; days: DailyMenus[] } | null>(null);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const controller = new AbortController();
    async function load() {
      const current = ++generation;
      try {
        const todayResponse = await fetch("/api/selections/today", { cache: "no-store", signal: controller.signal });
        if (todayResponse.status === 401) {
          if (active && current === generation) { setData(null); setLoginRequired(true); setError(""); }
          return;
        }
        const today = await todayResponse.json();
        if (!todayResponse.ok) throw new Error(today.error?.message ?? "기록을 불러오지 못했어요.");
        const from = new Date(new Date(`${today.date}T00:00:00Z`).getTime() - 365 * 86400000).toISOString().slice(0, 10);
        const historyResponse = await fetch(`/api/selections?from=${from}&to=${today.date}`, { cache: "no-store", signal: controller.signal });
        if (historyResponse.status === 401) {
          if (active && current === generation) { setData(null); setLoginRequired(true); }
          return;
        }
        const history = await historyResponse.json();
        if (!historyResponse.ok) throw new Error(history.error?.message ?? "기록을 불러오지 못했어요.");
        const past = (history.days as ApiDay[]).filter(day => Object.values(day.meals).some(Boolean)).map(toDay);
        if (active && current === generation) {
          setData({ today: today.date, days: [toDay(today), ...past] });
          setError(""); setLoginRequired(false);
        }
      } catch (err) {
        if (active && current === generation) { setData(null); setError(err instanceof Error ? err.message : "기록 조회 실패"); }
      }
    }
    function refresh() { if (document.visibilityState === "visible") void load(); }
    function authChanged() { setData(null); setLoginRequired(false); void load(); }
    void load();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("menuer-auth-change", authChanged);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false; controller.abort(); window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("menuer-auth-change", authChanged);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [attempt]);
  if (loginRequired) return <p className="text-center py-8"><Link href="/login" className="underline">로그인하고 내 식사 기록 보기</Link></p>;
  if (error) return <div role="alert" className="text-center py-8"><p>{error}</p><button className="underline" onClick={() => setAttempt(value => value + 1)}>다시 불러오기</button></div>;
  if (!data) return <p className="text-center py-8">기록을 불러오는 중...</p>;
  return <div className="mh-daily-list">
    <DailyRecommendations days={data.days} editableDate={data.today} recommendHref={(date, meal) => {
      const url = new URL(recommendationHref, "http://menuer.local");
      url.searchParams.set("date", date); url.searchParams.set("meal", meal);
      return `${url.pathname}${url.search}${url.hash}`;
    }} />
    {data.days.length === 1 && <p className="text-center text-sm text-neutral-500 py-6">아직 지난 식사 기록이 없어요.</p>}
  </div>;
}
