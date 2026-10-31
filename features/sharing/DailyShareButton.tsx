"use client";

import { useState } from "react";
import { buildDailyShare } from "@/lib/daily-share";
import type { DailyMenus } from "@/components/DailyRecommendations";

export default function DailyShareButton({ day }: { day: DailyMenus }) {
  const [status, setStatus] = useState("");
  const shared = buildDailyShare(day.date, {
    breakfast: day.meals.breakfast ? { name: day.meals.breakfast } : null,
    lunch: day.meals.lunch ? { name: day.meals.lunch } : null,
    dinner: day.meals.dinner ? { name: day.meals.dinner } : null,
  });
  async function share() {
    if (!shared.sharePath) return;
    setStatus("");
    const url = `${location.origin}${shared.sharePath}`;
    if (navigator.share) {
      try { await navigator.share({ title: shared.title, text: shared.shareText ?? "", url }); return; }
      catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); setStatus("링크를 복사했어요."); }
    catch { setStatus("복사하지 못했어요. 공유 화면에서 주소를 복사해주세요."); }
  }
  return <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 px-6 py-4">
    <span role="status" className="text-xs text-neutral-500">{status}</span>
    {shared.sharePath && <a href={shared.sharePath} className="text-xs text-neutral-500 underline">공유 미리보기</a>}
    <button type="button" aria-label={`${day.date} 하루 공유`} disabled={!shared.canShare} onClick={() => void share()} className="rounded-xl border border-neutral-300 bg-white px-5 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-default disabled:opacity-40">하루 공유</button>
  </div>;
}
