import { authFailure, authResponse, readAuthBody, signup } from "@/lib/auth";
export async function POST(request: Request) {
  try { return authResponse({ user: await signup(await readAuthBody(request)) }, 201); }
  catch (error) { return authFailure(error); }
}
