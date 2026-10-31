import { connection } from "next/server";
import { authFailure, authResponse, requireUser } from "@/lib/auth";
import { selectionDay } from "@/lib/selection-date";
import { listSelections } from "@/lib/selections";
import { buildDailyShare } from "@/lib/daily-share";

export async function GET() {
  await connection();
  try {
    const user = await requireUser();
    const { today } = selectionDay();
    const result = await listSelections(user.id, today, today, true);
    const meals = result.days.find(day => day.date === today)?.meals ?? {
      breakfast: null, lunch: null, dinner: null,
    };
    return authResponse(buildDailyShare(today, meals));
  } catch (error) { return authFailure(error, "daily-share"); }
}
