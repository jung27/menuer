export type MenuHistoryRecord = {
  id: string;
  name: string;
  /** ISO 8601 timestamp, including the time zone offset. */
  chosenAt: string;
  senses?: readonly string[];
  /** Set this to a public image path or URL when menu photos are available. */
  imageUrl?: string;
};

// Replace these preview records with the backend's selected-menu history.
export const previewMenuHistory: readonly MenuHistoryRecord[] = [
  {
    id: "preview-1",
    name: "마라탕",
    chosenAt: "2026-10-31T12:30:00+09:00",
    senses: ["매움 72%", "뜨거움 65%"],
  },
  {
    id: "preview-2",
    name: "치킨 샐러드",
    chosenAt: "2026-10-30T18:20:00+09:00",
    senses: ["바삭함 60%", "든든함 45%"],
  },
  {
    id: "preview-3",
    name: "떡볶이",
    chosenAt: "2026-10-30T12:10:00+09:00",
    senses: ["매움 80%", "달달함 45%"],
  },
  {
    id: "preview-4",
    name: "등심 돈가스",
    chosenAt: "2026-10-29T13:15:00+09:00",
    senses: ["바삭함 85%", "든든함 70%"],
  },
  {
    id: "preview-5",
    name: "크림 파스타",
    chosenAt: "2026-10-28T18:40:00+09:00",
    senses: ["미끄러움 65%", "든든함 60%"],
  },
  {
    id: "preview-6",
    name: "김치찌개",
    chosenAt: "2026-10-27T12:00:00+09:00",
    senses: ["뜨거움 85%", "매움 55%"],
  },
  {
    id: "preview-7",
    name: "수제 버거",
    chosenAt: "2026-10-26T12:45:00+09:00",
    senses: ["든든함 80%", "바삭함 50%"],
  },
];

export function sortMenuHistory(records: readonly MenuHistoryRecord[]) {
  return [...records].sort(
    (a, b) => Date.parse(b.chosenAt) - Date.parse(a.chosenAt),
  );
}

export function formatHistoryDate(chosenAt: string) {
  const date = new Date(chosenAt);
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";

  return {
    date: `${part("month")}.${part("day")}`,
    year: part("year"),
    weekday: part("weekday"),
    fullDate: `${part("year")}년 ${part("month")}월 ${part("day")}일`,
    time: new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date),
  };
}
