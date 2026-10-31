import { authFailure, authResponse, login, readAuthBody } from "@/lib/auth";
export async function POST(request: Request) {
  try { return authResponse({ user: await login(await readAuthBody(request)) }); }
  catch (error) { return authFailure(error); }
}
