import { assertSameOrigin, authFailure, authResponse, logout } from "@/lib/auth";
export async function POST(request: Request) {
  try { assertSameOrigin(request); await logout(); return authResponse({ ok: true }); }
  catch (error) { return authFailure(error, "logout"); }
}
