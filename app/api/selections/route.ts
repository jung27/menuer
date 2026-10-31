import { authFailure, authResponse, readAuthBody, requireUser } from "@/lib/auth";
import { listSelections, parseDate, selectMenu } from "@/lib/selections";

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await readAuthBody(request);
    return authResponse(await selectMenu(user.id, body));
  } catch (error) { return authFailure(error, "selection-save"); }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const params = new URL(request.url).searchParams;
    const from = parseDate(params.get("from"));
    const to = parseDate(params.get("to"));
    return authResponse(await listSelections(user.id, from, to));
  } catch (error) { return authFailure(error, "selections"); }
}
