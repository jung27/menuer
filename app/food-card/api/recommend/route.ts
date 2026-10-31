import { FOODS } from "../../foods";
import { TAGS, rank, type Taste } from "../../taste";

// 받는 값: { "매운맛": 30, "단맛": 12, ... }  돌려주는 값: { ranking: [...Top 5] }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: "취향 JSON이 필요합니다" }, { status: 400 });
  }
  const taste = Object.fromEntries(
    TAGS.map((t) => {
      const v = Number(body[t]);
      return [t, Number.isFinite(v) && v > 0 ? v : 0];
    }),
  ) as Taste;
  return Response.json({ ranking: rank(taste, FOODS) });
}
