"use client";

import { buildDailyShare } from "@/lib/daily-share";
import type { DailyMenus } from "@/components/DailyRecommendations";
import type { ShareFeedback } from "./useShareFeedbackGroup";
import ShareButtonLabel from "./ShareButtonLabel";

export default function DailyShareButton({ day, feedback }: { day: DailyMenus; feedback: ShareFeedback }) {
  const { status } = feedback;
  const shared = buildDailyShare(day.date, {
    breakfast: day.meals.breakfast ? { name: day.meals.breakfast } : null,
    lunch: day.meals.lunch ? { name: day.meals.lunch } : null,
    dinner: day.meals.dinner ? { name: day.meals.dinner } : null,
  });
  async function share() {
    if (!shared.sharePath) return;
    const finish = feedback.begin();
    const url = `${location.origin}${shared.sharePath}`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: shared.title, url }); return; }
      catch (cause) { if (cause instanceof Error && cause.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); finish("copied"); }
    catch { finish("failed"); }
  }
  if (!shared.canShare) return null;
  return <div className="absolute right-12 top-3.5">
    <span role="status" className="sr-only">{status === "copied" ? "링크를 복사했어요." : status === "failed" ? "복사하지 못했어요. 다시 시도해주세요." : ""}</span>
    <button type="button" aria-label={`${day.date} 하루 전체 공유`} onClick={() => void share()} className="cursor-pointer whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs font-normal text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500 sm:text-sm"><ShareButtonLabel label="하루 전체 공유" status={status} /></button>
  </div>;
}
