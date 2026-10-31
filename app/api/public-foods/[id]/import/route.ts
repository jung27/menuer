import { assertSameOrigin, authFailure, authResponse, requireUser } from "@/lib/auth";
import { importPublishedFood } from "@/lib/custom-foods";

export async function POST(request: Request, context: RouteContext<"/api/public-foods/[id]/import">) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(), { id } = await context.params;
    const result = await importPublishedFood(user.id, id);
    return authResponse(result, result.imported ? 201 : 200);
  } catch (error) { return authFailure(error); }
}
