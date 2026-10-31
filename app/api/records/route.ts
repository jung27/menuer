import { authFailure, requireUser } from "@/lib/auth";
import { publicRecord, recordsCollection } from "@/lib/records";

export async function GET(request: Request) {
  let user;
  try { user = await requireUser(); } catch (error) { return authFailure(error); }
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return Response.json({ error: { code: "INVALID_DATE", message: "date를 YYYY-MM-DD 형식의 실제 날짜로 보내주세요." } }, { status: 400 });
  }
  const offset = Number(params.get("offset") ?? "0");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
    return Response.json({ error: { code: "INVALID_OFFSET", message: "offset은 0~100000의 정수여야 합니다." } }, { status: 400 });
  }
  try {
    const collection = await recordsCollection();
    const records = await collection.find({ userId: user.id, recordDate: date })
      .sort({ createdAt: -1, _id: -1 }).skip(offset).limit(101).toArray();
    return Response.json({ date, records: records.slice(0, 100).map(publicRecord),
      nextOffset: records.length > 100 ? offset + 100 : null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: { code: "DATABASE_UNAVAILABLE", message: "기록을 불러오지 못했어요. 잠시 후 다시 시도해주세요." } }, { status: 503 });
  }
}
