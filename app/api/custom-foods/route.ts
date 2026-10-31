import { AuthError, authFailure, authResponse, readAuthBody, requireUser } from "@/lib/auth";
import { createCustomFood, listCustomFoods } from "@/lib/custom-foods";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    return authResponse(await listCustomFoods(user.id, Number(new URL(request.url).searchParams.get("offset") ?? 0)));
  } catch (error) { return authFailure(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (Number(request.headers.get("content-length")) > 600000) throw new AuthError(413, "IMAGE_TOO_LARGE", "그림 파일의 크기를 줄여주세요.");
    return authResponse({ food: await createCustomFood(user.id, await readAuthBody(request)) }, 201);
  } catch (error) { return authFailure(error); }
}
