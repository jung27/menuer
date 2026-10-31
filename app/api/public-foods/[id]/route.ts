import { connection } from "next/server";
import { authFailure, authResponse } from "@/lib/auth";
import { getPublishedFood } from "@/lib/custom-foods";

export async function GET(_request: Request, context: RouteContext<"/api/public-foods/[id]">) {
  try {
    await connection();
    const { id } = await context.params;
    return authResponse({ food: await getPublishedFood(id) });
  } catch (error) { return authFailure(error); }
}
