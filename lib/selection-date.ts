export function selectionDay(now = new Date()) {
  const shifted = new Date(now.getTime() + 9 * 3600000);
  const today = shifted.toISOString().slice(0, 10);
  const yesterday = new Date(shifted.getTime() - 86400000).toISOString().slice(0, 10);
  const closesAt = new Date(new Date(`${today}T00:00:00+09:00`).getTime() + 86400000).toISOString();
  return { today, yesterday, closesAt };
}
