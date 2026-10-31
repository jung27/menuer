"use client";

import { useSyncExternalStore } from "react";
import DailyRecommendations, { type DailyMenus } from "@/components/DailyRecommendations";
import { koreaCalendarDate, prepareDailyMenus } from "./daily-menu-data";

function getToday() { return koreaCalendarDate(new Date()); }
function getServerToday() { return ""; }
function subscribeToDateChange(listener: () => void) {
  const timer = window.setInterval(listener, 60000);
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", listener);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", listener);
  };
}

export default function DailyMenuList({
  days,
  recommendationHref = "/food-card",
}: {
  days: readonly DailyMenus[];
  recommendationHref?: string;
}) {
  // The server snapshot is stable; the browser supplies today's Korean date
  // after hydration and updates it when the calendar day changes.
  const today = useSyncExternalStore(subscribeToDateChange, getToday, getServerToday);
  const history = prepareDailyMenus(days, today || undefined);

  return (
    <div className="mh-daily-list">
      <DailyRecommendations
        days={history}
        recommendHref={(date, meal) => {
          const url = new URL(recommendationHref, "http://menuer.local");
          url.searchParams.set("date", date);
          url.searchParams.set("meal", meal);
          return `${url.pathname}${url.search}${url.hash}`;
        }}
      />
    </div>
  );
}
