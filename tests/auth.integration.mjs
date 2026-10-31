// 실행 중인 로컬 개발 서버와 .env.local의 DB를 사용합니다. 생성한 테스트 데이터만 삭제합니다.
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { MongoClient } = require("mongodb");
const base = "http://localhost:3000";
const suffix = randomUUID();
const emails = [`auth-test-${suffix}-a@example.invalid`, `auth-test-${suffix}-b@example.invalid`];
const password = `Test-only-${randomUUID()}`;
const a = { cookie: "" }, b = { cookie: "" }, fresh = { cookie: "" };
async function call(path, session, method = "GET", body, extra = {}) {
  const response = await fetch(base + path, { method, headers: {
    ...(session.cookie ? { Cookie: session.cookie } : {}),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...extra,
  }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  for (const cookie of response.headers.getSetCookie()) {
    if (cookie.startsWith("menuer_session=")) {
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=lax/i);
      session.cookie = cookie.split(";")[0];
    }
  }
  const data = await response.json();
  return { status: response.status, data };
}
let client;
try {
  assert.equal((await call("/api/auth/me", fresh)).status, 401);
  assert.equal((await call("/api/records?date=2026-10-31", fresh)).status, 401);
  assert.equal((await call("/api/recommendations", fresh, "POST", {})).status, 401);
  assert.equal((await call("/api/auth/signup", fresh, "POST", {email:emails[0],password:"short",nickname:"test"})).status, 400);
  for (const email of emails) {
    assert.equal((await call("/api/auth/signup", fresh, "POST", {email,password,nickname:"통합테스트"})).status, 201);
  }
  assert.equal((await call("/api/auth/signup", fresh, "POST", {email:emails[0].toUpperCase(),password,nickname:"duplicate"})).status, 409);
  assert.equal((await call("/api/auth/login", a, "POST", {email:emails[0],password:"wrong-password-123"})).status, 401);
  assert.equal((await call("/api/auth/login", a, "POST", {email:emails[0],password}, {Origin:"https://other.invalid"})).status, 403);
  const loginA = await call("/api/auth/login", a, "POST", {email:emails[0],password});
  assert.equal(loginA.status, 200);
  assert.equal("passwordHash" in loginA.data.user, false);
  assert.equal((await call("/api/auth/login", b, "POST", {email:emails[1],password})).status, 200);
  assert.equal((await call("/api/auth/me", a)).data.user.id, loginA.data.user.id);
  const body = {requestId:`test-${suffix}`,tasteScores:{spicy:0.2,sweet:0.1,salty:0.3,oily:0.5,soupy:0,crispy:0.5}};
  const saved = await call("/api/recommendations", a, "POST", body);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.saved, true);
  assert.equal((await call("/api/recommendations", a, "POST", body)).data.recordId, saved.data.recordId);
  const path = `/api/records?date=${saved.data.recordDate}`;
  assert.equal((await call(path, a)).data.records.length, 1);
  assert.equal((await call(path, b)).data.records.length, 0);
  const savedB = await call("/api/recommendations", b, "POST", body);
  assert.equal(savedB.status, 200);
  assert.notEqual(savedB.data.recordId, saved.data.recordId);
  const selectionBody = {date:"2026-10-31",meal:"lunch",recordId:saved.data.recordId,menuId:saved.data.recommendations[0].menuId};
  assert.equal((await call("/api/selections",fresh,"PUT",selectionBody)).status,401);
  assert.equal((await call("/api/selections",b,"PUT",selectionBody)).status,404);
  assert.equal((await call("/api/selections",a,"PUT",{...selectionBody,menuId:"not-a-menu"})).status,400);
  assert.equal((await call("/api/selections",a,"PUT",{...selectionBody,date:"2026-02-30"})).status,400);
  assert.equal((await call("/api/selections",a,"PUT",{...selectionBody,meal:"snack"})).status,400);
  assert.equal((await call("/api/selections",a,"PUT",selectionBody,{Origin:"https://other.invalid"})).status,403);
  const selectionPath="/api/selections?from=2026-10-30&to=2026-10-31";
  assert.equal((await call("/api/selections",a,"PUT",selectionBody)).status,200);
  const selected = await call(selectionPath,a);
  assert.equal(selected.data.days.length,2);
  assert.equal(selected.data.days[0].meals.lunch.menuId,selectionBody.menuId);
  assert.equal(selected.data.days[0].meals.breakfast,null);
  assert.equal(selected.data.days[1].meals.lunch,null);
  assert.equal((await call(selectionPath,b)).data.days[0].meals.lunch,null);
  const replacement={...selectionBody,menuId:saved.data.recommendations[1].menuId};
  const concurrent=await Promise.all(Array.from({length:3},()=>call("/api/selections",a,"PUT",replacement)));
  assert.ok(concurrent.every(result=>result.status===200));
  assert.equal((await call(selectionPath,a)).data.days[0].meals.lunch.menuId,replacement.menuId);
  for (const meal of ["breakfast","dinner"]) assert.equal((await call("/api/selections",a,"PUT",{...selectionBody,meal})).status,200);
  assert.ok(Object.values((await call(selectionPath,a)).data.days[0].meals).every(Boolean));
  assert.equal((await call("/api/selections?from=2026-11-01&to=2026-10-31",a)).status,400);
  assert.equal((await call("/api/selections?from=2025-01-01&to=2026-12-31",a)).status,400);
  assert.equal((await call(path,a)).data.records.length,1); // 선정·교체는 추천 이력을 변경하지 않음
  const revoked = {cookie:a.cookie};
  assert.equal((await call("/api/auth/logout", a, "POST")).status, 200);
  assert.equal((await call("/api/auth/me", revoked)).status, 401);
  assert.equal((await call(path, a)).status, 401);
  const anotherBrowser = {cookie:""};
  assert.equal((await call("/api/auth/login", anotherBrowser, "POST", {email:emails[0],password})).status, 200);
  assert.equal((await call(path, anotherBrowser)).data.records[0].recordId, saved.data.recordId);
  assert.equal((await call(selectionPath,anotherBrowser)).data.days[0].meals.lunch.menuId,replacement.menuId);
  client = new MongoClient(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
  await client.connect();
  const db = client.db(process.env.MONGODB_DB);
  const user = await db.collection("users").findOne({email:emails[0]});
  assert.equal(await db.collection("selections").countDocuments({userId:user._id,date:"2026-10-31"}),3);
  assert.match(user.passwordHash, /^scrypt-v1\$/);
  assert.equal("password" in user, false);
  const tokenHash = createHash("sha256").update(anotherBrowser.cookie.split("=")[1]).digest("hex");
  await db.collection("sessions").updateOne({_id:tokenHash},{$set:{expiresAt:new Date(0)}});
  assert.equal((await call("/api/auth/me", anotherBrowser)).status,401);
  let last;
  for(let i=0;i<11;i++) last=await call("/api/auth/login",b,"POST",{email:emails[1],password:"wrong-password-123"});
  assert.equal(last.status,429);
  console.log("PASS: authentication, records, selection ownership, menu validation, meal slots, replacement, concurrent writes, empty days, date range, cross-browser selections");
} finally {
  client ??= new MongoClient(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB);
    const users = await db.collection("users").find({email:{$in:emails}}).toArray();
    const userIds = users.map(user=>user._id);
    await db.collection("recommendations").deleteMany({userId:{$in:userIds}});
    await db.collection("selections").deleteMany({userId:{$in:userIds}});
    await db.collection("sessions").deleteMany({userId:{$in:userIds}});
    await db.collection("users").deleteMany({email:{$in:emails}});
    const window = Math.floor(Date.now() / (15*60*1000));
    const ids = emails.flatMap(email=>[window-1,window,window+1].map(w=>createHash("sha256").update(`${email}:${w}`).digest("hex")));
    await db.collection("auth_attempts").deleteMany({_id:{$in:ids}});
    console.log("Test data cleaned up.");
  } finally { await client.close(); }
}
