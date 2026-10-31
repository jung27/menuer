import { AuthError, authFailure, authResponse, readAuthBody, requireUser } from "@/lib/auth";
import { getCustomFood, updateCustomFood } from "@/lib/custom-foods";

export async function GET(_request: Request, context: RouteContext<"/api/custom-foods/[id]">) {
  try {
    const user = await requireUser(), { id } = await context.params;
    return authResponse({ food: await getCustomFood(user.id, id) });
  } catch (error) { return authFailure(error); }
}
export async function PATCH(request: Request, context: RouteContext<"/api/custom-foods/[id]">) {
  try {
    const user = await requireUser(), { id } = await context.params;
    if (Number(request.headers.get("content-length")) > 600000) throw new AuthError(413, "IMAGE_TOO_LARGE", "그림 파일의 크기를 줄여주세요.");
    return authResponse({ food: await updateCustomFood(user.id, id, await readAuthBody(request)) });
  } catch (error) { return authFailure(error); }
}
