import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";

export type Operation = "auth" | "login" | "signup" | "logout" | "session" | "recommendation" | "records" | "selection-save" | "selections" | "today" | "daily-share" | "db-health" | "food-card";

// 원문 메시지/스택/접속 주소/사용자 입력을 출력하지 않고 고정된 분류만 사용합니다.
export function classifyFailure(error: unknown) {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  const kinds = new Set<string>();
  while (queue.length && seen.size < 40) {
    const item = queue.shift();
    if (!item || typeof item !== "object" || seen.has(item)) continue;
    seen.add(item);
    const e = item as Record<string, unknown>;
    const name = typeof e.name === "string" ? e.name : "";
    const message = typeof e.message === "string" ? e.message : "";
    if (e.code === 18 || /bad auth|authentication failed/i.test(message)) kinds.add("DB_AUTH_FAILED");
    if (/configuration is incomplete/.test(message) || name === "MongoParseError") kinds.add("DB_CONFIG_INVALID");
    if (["ENOTFOUND", "EAI_AGAIN", "ESERVFAIL", "ECONNREFUSED"].includes(String(e.code)) && /querySrv|queryTxt|getaddrinfo/i.test(String(e.syscall))) kinds.add("DB_DNS_FAILED");
    if (/Mongo.*Timeout|MongoServerSelectionError/.test(name)) kinds.add("DB_TIMEOUT");
    if (/MongoNetwork/.test(name) || ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(String(e.code))) kinds.add("DB_CONNECTION_FAILED");
    if (name.startsWith("Mongo")) kinds.add("DB_OPERATION_FAILED");
    queue.push(e.cause, e.reason, e.error);
    if (e.servers instanceof Map) queue.push(...Array.from(e.servers.values()).slice(0, 20));
  }
  return ["DB_AUTH_FAILED", "DB_CONFIG_INVALID", "DB_DNS_FAILED", "DB_CONNECTION_FAILED", "DB_TIMEOUT", "DB_OPERATION_FAILED"]
    .find(kind => kinds.has(kind)) ?? "INTERNAL_ERROR";
}

export function reportFailure(error: unknown, operation: Operation) {
  // 사전 렌더링 중단/리다이렉트는 서비스 장애가 아닙니다.
  unstable_rethrow(error);
  const code = classifyFailure(error);
  const errorId = randomUUID();
  const status = code === "INTERNAL_ERROR" ? 500 : 503;
  console.error(JSON.stringify({ event: "server_failure", errorId, operation, code, status }));
  const messages: Record<string, string> = {
    DB_AUTH_FAILED: "서버의 DB 인증 설정에 문제가 있어요. 관리자에게 문의해주세요.",
    DB_CONFIG_INVALID: "서버의 DB 연결 설정을 확인해야 해요. 관리자에게 문의해주세요.",
    DB_DNS_FAILED: "서버가 DB 주소를 찾지 못했어요. 관리자에게 문의해주세요.",
    DB_CONNECTION_FAILED: "서버와 DB의 연결이 끊겼어요. 잠시 후 다시 시도해주세요.",
    DB_TIMEOUT: "DB 연결 또는 응답 시간이 초과됐어요. 잠시 후 다시 시도해주세요.",
    DB_OPERATION_FAILED: "DB에서 요청을 처리하지 못했어요. 관리자에게 문의해주세요.",
    INTERNAL_ERROR: "서버 내부 오류가 발생했어요. 관리자에게 문의해주세요.",
  };
  const retry = operation === "recommendation" ? " 저장 완료 여부를 확인하지 못했어요. 재시도할 때는 같은 requestId를 사용해주세요." : "";
  return { status, error: { code, errorId, message: `${messages[code]}${retry} (오류 ID: ${errorId})` } };
}

export function failureResponse(error: unknown, operation: Operation) {
  const failure = reportFailure(error, operation);
  return Response.json({ error: failure.error }, { status: failure.status,
    headers: { "Cache-Control": "private, no-store", "X-Error-Id": failure.error.errorId } });
}
