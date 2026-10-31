import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export async function getVisitorId() {
  const store = await cookies();
  let token = store.get("menuer_visitor")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    store.set("menuer_visitor", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  // 쿠키 원문은 DB나 API 응답에 저장하지 않습니다.
  return createHash("sha256").update(token).digest("hex");
}
