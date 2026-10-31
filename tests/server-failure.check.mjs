// node --experimental-strip-types tests/server-failure.check.mjs
import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === "next/navigation" ? "next/navigation.js" : specifier, context);
} });
const require = createRequire(import.meta.url);
// Next 번들러 밖의 서버 단위 검증에서만 server-only 마커를 대체합니다.
const marker = require.resolve("server-only");
require.cache[marker] = { id: marker, filename: marker, loaded: true, exports: {} };
const { classifyFailure, failureResponse } = await import("../lib/server-failure.ts");
const { readApiResponse } = await import("../lib/read-api-response.ts");
await assert.rejects(readApiResponse(new Response(null, { status: 502 })), /HTTP 502/);
await assert.rejects(readApiResponse(new Response("<html>error</html>", { status: 500 })), /HTTP 500/);
assert.deepEqual(await readApiResponse(Response.json({ ok: true })), { ok: true });

assert.equal(classifyFailure({ name: "MongoServerError", code: 18 }), "DB_AUTH_FAILED");
assert.equal(classifyFailure({ name: "MongoServerError", code: 8000, message: "bad auth : authentication failed" }), "DB_AUTH_FAILED");
assert.equal(classifyFailure(new Error("MongoDB environment configuration is incomplete.")), "DB_CONFIG_INVALID");
assert.equal(classifyFailure({ name: "MongoParseError" }), "DB_CONFIG_INVALID");
const nested = { name: "MongoServerSelectionError", reason: { servers: new Map([
  ["secret-host", { error: { cause: { code: "ENOTFOUND", syscall: "querySrv" } } }],
]) } };
assert.equal(classifyFailure(nested), "DB_DNS_FAILED");
assert.equal(classifyFailure({ name: "MongoNetworkError", cause: { code: "ECONNRESET" } }), "DB_CONNECTION_FAILED");
assert.equal(classifyFailure({ name: "MongoServerSelectionError" }), "DB_TIMEOUT");
assert.equal(classifyFailure({ name: "MongoServerError", code: 11000 }), "DB_OPERATION_FAILED");
const cyclic = new Error("private customer detail"); cyclic.cause = cyclic;
assert.equal(classifyFailure(cyclic), "INTERNAL_ERROR");

const logs = [];
const original = console.error;
console.error = line => logs.push(line);
try {
  const redirect = Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;replace;/login;307;" });
  assert.throws(() => failureResponse(redirect, "session"), value => value === redirect);
  assert.equal(logs.length, 0);
  const error = new Error("bad auth : authentication failed mongodb+srv://private:password@secret-host email@example.invalid");
  const response = failureResponse(error, "recommendation");
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.error.code, "DB_AUTH_FAILED");
  assert.match(body.error.message, /같은 requestId/);
  assert.equal(response.headers.get("x-error-id"), body.error.errorId);
  assert.equal(JSON.parse(logs[0]).errorId, body.error.errorId);
  assert.equal(JSON.parse(logs[0]).operation, "recommendation");
  const output = JSON.stringify({ logs, body });
  for (const secret of ["mongodb+srv", "password", "secret-host", "email@example.invalid"]) assert.ok(!output.includes(secret));
  assert.equal(failureResponse(new Error("private detail"), "login").status, 500);
} finally { console.error = original; }
console.log("PASS: error classification, nested causes, safe logs/responses, tracking IDs, retry guidance");
