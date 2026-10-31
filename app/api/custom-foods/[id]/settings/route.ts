import { authFailure, authResponse, readAuthBody, requireUser } from "@/lib/auth";
import { updateFoodSettings } from "@/lib/custom-foods";

export async function PATCH(request: Request, context: RouteContext<"/api/custom-foods/[id]/settings">) {
  try {
    const user = await requireUser(), { id } = await context.params;
    return authResponse({ food: await updateFoodSettings(user, id, await readAuthBody(request)) });
  } catch (error) { return authFailure(error); }
}
