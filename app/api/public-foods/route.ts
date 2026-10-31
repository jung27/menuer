import { authFailure, authResponse } from "@/lib/auth";
import { listPublishedFoods } from "@/lib/custom-foods";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    return authResponse(await listPublishedFoods(params.get("q") ?? "", Number(params.get("offset") ?? 0)));
  } catch (error) { return authFailure(error); }
}
