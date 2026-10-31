export type MenuHistoryRecord = {
  id: string;
  name: string;
  /** ISO 8601 timestamp, including the time zone offset. */
  chosenAt: string;
  senses?: readonly string[];
  /** Set this to a public image path or URL when menu photos are available. */
  imageUrl?: string;
};

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
