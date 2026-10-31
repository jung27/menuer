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
    <button type="button" aria-label={`${day.date} 하루 전체 공유`} title="하루 전체 공유" onClick={() => void share()} className="inline-flex size-10 cursor-pointer items-center justify-center rounded-xl border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"><ShareButtonLabel label="하루 전체 공유" status={status} iconOnly /></button>
  </div>;
}
