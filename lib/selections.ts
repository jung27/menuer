import "server-only";
import { createHash } from "node:crypto";
import { AuthError } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { recordsCollection } from "@/lib/records";
import { selectionDay } from "@/lib/selection-date";

export const meals = ["breakfast", "lunch", "dinner"] as const;
type Meal = typeof meals[number];
type Selection = {
  _id: string; userId: string; date: string; meal: Meal;
  recordId: string; menuId: string; name: string; selectedAt: Date;
};
let indexes: Promise<void> | undefined;
async function collection() {
  const db = await getDatabase();
  const selections = db.collection<Selection>("selections");
  indexes ??= selections.createIndex({ userId: 1, date: 1 }).then(() => undefined)
    .catch((error) => { indexes = undefined; throw error; });
  await indexes;
  return selections;
}
export function parseDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AuthError(400, "INVALID_DATE", "날짜는 YYYY-MM-DD 형식으로 보내주세요.");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AuthError(400, "INVALID_DATE", "실제로 존재하는 날짜를 보내주세요.");
  }
  return value;
}
function publicSelection(selection: Selection) {
  return {
    recordId: selection.recordId, menuId: selection.menuId,
    name: selection.name, selectedAt: selection.selectedAt.toISOString(),
  };
}
export async function selectMenu(userId: string, body: Record<string, unknown>) {
  const date = parseDate(body.date);
  function assertToday() {
    const { today } = selectionDay();
    if (date < today) throw new AuthError(409, "DAY_CLOSED", "하루가 끝난 기록은 수정할 수 없어요.");
    if (date > today) throw new AuthError(400, "FUTURE_DATE", "오늘의 메뉴만 선정할 수 있어요.");
  }
  assertToday();
  if (!meals.some((meal) => meal === body.meal)) {
    throw new AuthError(400, "INVALID_MEAL", "meal은 breakfast, lunch, dinner 중 하나여야 합니다.");
  }
  if (typeof body.recordId !== "string" || !/^[a-f0-9]{64}$/.test(body.recordId) ||
      typeof body.menuId !== "string" || !body.menuId || body.menuId.length > 200) {
    throw new AuthError(400, "INVALID_INPUT", "recordId와 menuId를 확인해주세요.");
  }
  const record = await (await recordsCollection()).findOne({ _id: body.recordId, userId });
  if (!record) throw new AuthError(404, "RECORD_NOT_FOUND", "추천 기록을 찾을 수 없어요.");
  const menu = record.recommendations.find((item) => item.menuId === body.menuId);
  if (!menu) throw new AuthError(400, "MENU_NOT_RECOMMENDED", "해당 추천 결과에 포함된 메뉴만 선정할 수 있어요.");
  const meal = body.meal as Meal;
  const _id = createHash("sha256").update(JSON.stringify([userId, date, meal])).digest("hex");
  const selections = await collection();
  // DB 조회 중 자정을 넘겼다면 이전 날짜로 저장하지 않습니다.
  assertToday();
  const values = { userId, date, meal, recordId: record._id, menuId: menu.menuId, name: menu.name, selectedAt: new Date() };
  // 날짜·끼니별 고정 _id로 중복 생성을 막고, 새 선택은 원자적으로 교체합니다.
  let result;
  try {
    result = await selections.findOneAndUpdate({ _id }, { $set: values }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    assertToday();
    result = await selections.findOneAndUpdate({ _id }, { $set: values }, { returnDocument: "after" });
  }
  if (!result) throw new Error("Selection was not saved.");
  return { date, meal, selection: publicSelection(result) };
}
export async function listSelections(userId: string, from: string, to: string, includeToday = false) {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const requestedEnd = new Date(`${to}T00:00:00.000Z`).getTime();
  const dayMs = 86400000;
  if (requestedEnd < start || (requestedEnd - start) / dayMs >= 366) {
    throw new AuthError(400, "INVALID_RANGE", "from부터 to까지 최대 366일을 조회할 수 있어요.");
  }
  const { today, yesterday, closesAt } = selectionDay();
  const visibleTo = to < (includeToday ? today : yesterday) ? to : (includeToday ? today : yesterday);
  const end = new Date(`${visibleTo}T00:00:00.000Z`).getTime();
  const rows = end < start ? [] : await (await collection()).find({ userId, date: { $gte: from, $lte: visibleTo } }).toArray();
  const byDate = new Map<string, Partial<Record<Meal, ReturnType<typeof publicSelection>>>>();
  for (const row of rows) {
    const slots = byDate.get(row.date) ?? {};
    slots[row.meal] = publicSelection(row);
    byDate.set(row.date, slots);
  }
  const days = [];
  for (let time = end; time >= start; time -= dayMs) {
    const date = new Date(time).toISOString().slice(0, 10);
    const slots = byDate.get(date);
    days.push({ date, meals: { breakfast: slots?.breakfast ?? null, lunch: slots?.lunch ?? null, dinner: slots?.dinner ?? null } });
  }
  return { from, to, today, closesAt, days };
}
