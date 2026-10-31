import { authFailure, authResponse, requireUser } from "@/lib/auth";
export async function GET() {
  try { return authResponse({ user: await requireUser() }); }
  catch (error) { return authFailure(error, "session"); }
}
