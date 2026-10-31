import { getDatabase } from "@/lib/mongodb";
import { connection } from "next/server";
import { reportFailure } from "@/lib/server-failure";

export async function GET() {
  await connection();
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 }, { timeoutMS: 5000 });
    return Response.json({ ok: true, database: "connected" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const failure = reportFailure(error, "db-health");
    return Response.json({ ok: false, database: "unavailable", error: failure.error }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Error-Id": failure.error.errorId },
    });
  }
}
