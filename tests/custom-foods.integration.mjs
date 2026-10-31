// Uses only uniquely named test accounts and cleans their data in finally.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { emptyCustomFood } from "../features/custom-foods/model.ts";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { MongoClient } = require("mongodb");
const suffix = randomUUID(), password = `Test-only-${randomUUID()}`;
const emails = [`custom-food-test-${suffix}-a@example.invalid`, `custom-food-test-${suffix}-b@example.invalid`];
const sessions = [{ cookie: "" }, { cookie: "" }];
const startWindow = Math.floor(Date.now() / 900000);
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
async function call(path, session, method = "GET", body, headers = {}) {
  const response = await fetch(`http://localhost:3000${path}`, { method, headers: {
    ...(session.cookie ? { Cookie: session.cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...headers,
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  for (const cookie of response.headers.getSetCookie()) if (cookie.startsWith("menuer_session=")) session.cookie = cookie.split(";")[0];
  return { status: response.status, body: await response.json() };
}
try {
  assert.equal((await call("/api/custom-foods", { cookie: "" })).status, 401);
  for (let i = 0; i < 2; i++) {
    assert.equal((await call("/api/auth/signup", sessions[i], "POST", { email: emails[i], password, nickname: "음식 테스트" })).status, 201);
    assert.equal((await call("/api/auth/login", sessions[i], "POST", { email: emails[i], password })).status, 200);
  }
  const draft = { ...emptyCustomFood(), name: "테스트 음식" };
  assert.equal((await call("/api/custom-foods", sessions[0], "POST", draft, { Origin: "https://other.invalid" })).status, 403);
  assert.equal((await call("/api/custom-foods", sessions[0], "POST", { ...draft, tags: { ...draft.tags, 바삭함: 5 } })).status, 400);
  assert.equal((await call("/api/custom-foods", sessions[0], "POST", { ...draft, image: "data:image/png;base64,YmFk" })).status, 400);
  const created = await call("/api/custom-foods", sessions[0], "POST", draft);
  assert.equal(created.status, 201);
  const id = created.body.food.id;
  assert.equal("userId" in created.body.food, false);
  assert.equal((await call("/api/custom-foods", sessions[0])).body.foods[0].id, id);
  assert.equal((await call("/api/custom-foods", sessions[1])).body.foods.length, 0);
  assert.equal((await call(`/api/custom-foods/${id}`, sessions[1])).status, 404);
  assert.equal((await call(`/api/custom-foods/${id}`, sessions[1], "PATCH", draft)).status, 404);
  draft.tags.바삭함 = 0.8; draft.physics.baseColor = "#2563EB"; draft.physics.maxStretch = 1.8; draft.physics.pattern = "fried";
  assert.equal((await call(`/api/custom-foods/${id}`, sessions[0], "PATCH", draft)).status, 200);
  const read = (await call(`/api/custom-foods/${id}`, sessions[0])).body.food;
  assert.equal(read.tags.바삭함, 0.8); assert.equal(read.physics.baseColor, "#2563EB"); assert.equal(read.physics.maxStretch, 1.8);
  assert.equal(read.physics.pattern, "fried");
  assert.equal((await call("/api/custom-foods?offset=-1", sessions[0])).status, 400);
  assert.equal((await call("/api/auth/logout", sessions[0], "POST")).status, 200);
  assert.equal((await call("/api/custom-foods", sessions[0])).status, 401);
  console.log("PASS: custom food create/read/update, ownership, authentication, same-origin, range and image validation, logout");
} catch (error) {
  console.error("FAIL custom-food tests:", error instanceof assert.AssertionError ? error.message : error.name);
  process.exitCode = 1;
} finally {
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
    const userIds = users.map(user => user._id);
    await db.collection("custom_foods").deleteMany({ userId: { $in: userIds } });
    await db.collection("sessions").deleteMany({ userId: { $in: userIds } });
    await db.collection("users").deleteMany({ _id: { $in: userIds } });
    const attempts = [];
    for (let window = startWindow; window <= Math.floor(Date.now() / 900000); window++) for (const email of emails) attempts.push(createHash("sha256").update(`${email}:${window}`).digest("hex"));
    await db.collection("auth_attempts").deleteMany({ _id: { $in: attempts } });
  } catch { console.error("Test fixture cleanup failed."); process.exitCode = 1; }
  await client.close();
}
