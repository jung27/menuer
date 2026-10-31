import { recommendMenus, sensationKeys, type SensationValues } from "@/lib/recommendations";
import { getVisitorId } from "@/lib/visitor";
import { publicRecord, saveRecommendation } from "@/lib/records";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(message: string) {
  return Response.json({ error: { code: "INVALID_INPUT", message } }, { status: 400 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("올바른 JSON을 보내주세요.");
  }

  if (!isObject(body) || !isObject(body.interactionMs)) {
    return badRequest("interactionMs에 항목별 상호작용 시간을 보내주세요.");
  }
  if (typeof body.requestId !== "string" || !body.requestId.trim() || body.requestId.length > 128) {
    return badRequest("requestId는 1~128자의 비어 있지 않은 문자열이어야 합니다.");
  }

  const entries = Object.entries(body.interactionMs);
  if (entries.length === 0) {
    return badRequest("상호작용 항목을 하나 이상 보내주세요.");
  }

  const times: [string, number][] = [];
  for (const [key, value] of entries) {
    if (!sensationKeys.some((allowed) => allowed === key)) {
      return badRequest(`지원하는 항목: ${sensationKeys.join(", ")}`);
    }
    if (
        typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return badRequest("시간은 0 이상의 유한한 숫자로 보내주세요.");
    }
    times.push([key, value]);
  }

  const totalInteractionMs = times.reduce((total, [, time]) => total + time, 0);
  if (!Number.isFinite(totalInteractionMs) || totalInteractionMs <= 0) {
    return badRequest("총 상호작용 시간은 0보다 큰 유한한 숫자여야 합니다.");
  }

  // 모든 항목의 누적 시간 합계를 분모로 사용합니다. 반올림은 화면에서 합니다.
  // 생략한 항목은 0으로 처리합니다. 0은 싫어함이 아니라 가중치 없음입니다.
  const timeMap = Object.fromEntries(times);
  const ratios = Object.fromEntries(sensationKeys.map((key) =>
    [key, (timeMap[key] ?? 0) / totalInteractionMs])) as SensationValues;

  const visitorId = await getVisitorId();
  const interactionMs = Object.fromEntries(sensationKeys.map((key) => [key, timeMap[key] ?? 0])) as SensationValues;
  try {
    const saved = await saveRecommendation({
      visitorId, requestId: body.requestId, interactionMs,
      totalInteractionMs, ratios, recommendations: recommendMenus(ratios),
    });
    if (sensationKeys.some((key) => saved.interactionMs[key] !== interactionMs[key])) {
      return Response.json({ error: { code: "REQUEST_ID_CONFLICT", message: "다른 입력에는 새 requestId를 사용해주세요." } }, { status: 409 });
    }
    return Response.json(publicRecord(saved), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "DATABASE_UNAVAILABLE", message: "저장하지 못했어요. 같은 requestId로 다시 시도해주세요." } }, { status: 503 });
  }
}
