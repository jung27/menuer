import { recommendMenus, recommendFoodCards, sensationKeys, type SensationValues } from "@/lib/recommendations";
import { assertSameOrigin, authFailure, requireUser } from "@/lib/auth";
import { publicRecord, saveRecommendation } from "@/lib/records";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function badRequest(message: string) {
  return Response.json({ error: { code: "INVALID_INPUT", message } }, { status: 400 });
}

export async function POST(request: Request) {
  let user;
  try { assertSameOrigin(request); user = await requireUser(); }
  catch (error) { return authFailure(error); }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("올바른 JSON을 보내주세요.");
  }

  if (!isObject(body) || (body.tasteScores !== undefined && body.interactionMs !== undefined)) {
    return badRequest("tasteScores 또는 interactionMs 중 하나만 보내주세요.");
  }
  const inputKind = body.tasteScores !== undefined ? "tasteScores" : "interactionMs";
  const input = body[inputKind];
  if (!isObject(input)) return badRequest("항목별 입력값을 객체로 보내주세요.");
  if (typeof body.requestId !== "string" || !body.requestId.trim() || body.requestId.length > 128) {
    return badRequest("requestId는 1~128자의 비어 있지 않은 문자열이어야 합니다.");
  }

  const entries = Object.entries(input);
  if (entries.length === 0) {
    return badRequest("상호작용 항목을 하나 이상 보내주세요.");
  }

  const times: [string, number][] = [];
  for (const [key, value] of entries) {
    if (!sensationKeys.some((allowed) => allowed === key)) {
      return badRequest(`지원하는 항목: ${sensationKeys.join(", ")}`);
    }
    if (
        typeof value !== "number" || !Number.isFinite(value) || value < 0 || (inputKind === "tasteScores" && value > 1)) {
      return badRequest("시간은 0 이상의 숫자, 취향 점수는 0~1의 숫자로 보내주세요.");
    }
    times.push([key, value]);
  }

  const totalInteractionMs = times.reduce((total, [, time]) => total + time, 0);
  if (!Number.isFinite(totalInteractionMs) || totalInteractionMs <= 0) {
    return badRequest("카드에 한 번 이상 상호작용해주세요. 입력 합계는 0보다 커야 합니다.");
  }

  // 모든 항목의 누적 시간 합계를 분모로 사용합니다. 반올림은 화면에서 합니다.
  // 생략한 항목은 0으로 처리합니다. 0은 싫어함이 아니라 가중치 없음입니다.
  const timeMap = Object.fromEntries(times);
  const ratios = Object.fromEntries(sensationKeys.map((key) =>
    [key, (timeMap[key] ?? 0) / totalInteractionMs])) as SensationValues;

  const values = Object.fromEntries(sensationKeys.map((key) => [key, timeMap[key] ?? 0])) as SensationValues;
  try {
    const saved = await saveRecommendation({
      userId: user.id, requestId: body.requestId, inputKind,
      interactionMs: inputKind === "interactionMs" ? values : null,
      tasteScores: inputKind === "tasteScores" ? values : null,
      totalInteractionMs: inputKind === "interactionMs" ? totalInteractionMs : null,
      ratios, recommendations: inputKind === "tasteScores" ? recommendFoodCards(values) : recommendMenus(ratios),
    });
    const savedValues = inputKind === "tasteScores" ? saved.tasteScores : saved.interactionMs;
    if ((saved.inputKind ?? "interactionMs") !== inputKind || !savedValues || sensationKeys.some((key) => savedValues[key] !== values[key])) {
      return Response.json({ error: { code: "REQUEST_ID_CONFLICT", message: "다른 입력에는 새 requestId를 사용해주세요." } }, { status: 409 });
    }
    return Response.json(publicRecord(saved), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "DATABASE_UNAVAILABLE", message: "저장하지 못했어요. 같은 requestId로 다시 시도해주세요." } }, { status: 503 });
  }
}
