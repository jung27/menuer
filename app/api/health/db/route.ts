import { getDatabase } from "@/lib/mongodb";
import { connection } from "next/server";

export async function GET() {
  await connection();
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 }, { timeoutMS: 5000 });
    return Response.json({ ok: true, database: "connected" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // 드라이버 오류에는 접속 정보가 들어갈 수 있어 응답이나 로그로 출력하지 않습니다.
    return Response.json({ ok: false, database: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
