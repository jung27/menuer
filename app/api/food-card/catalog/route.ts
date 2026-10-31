import { authFailure, authResponse, requireUser } from "@/lib/auth";
import { foodCardCatalog } from "@/lib/food-card-catalog";

export async function GET() {
  try {
    const user = await requireUser();
    return authResponse({ foods: await foodCardCatalog(user.id) });
  } catch (error) { return authFailure(error, "food-card"); }
}
