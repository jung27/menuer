import { authFailure, authResponse, requireUser } from "@/lib/auth";
import { listSelections } from "@/lib/selections";
import { selectionDay } from "@/lib/selection-date";

export async function GET() {
  try {
    const user = await requireUser();
    const { today } = selectionDay();
    const result = await listSelections(user.id, today, today, true);
    return authResponse({
      date: today, closesAt: result.closesAt,
      meals: result.days[0]?.meals ?? { breakfast: null, lunch: null, dinner: null },
    });
  } catch (error) { return authFailure(error); }
}
