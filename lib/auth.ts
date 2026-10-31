import "server-only";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/mongodb";
import { failureResponse, type Operation } from "./server-failure";

type User = { _id: string; email: string; nickname: string; passwordHash: string; createdAt: Date };
type Session = { _id: string; userId: string; expiresAt: Date };
type Attempt = { _id: string; count: number; expiresAt: Date };
const COOKIE = "menuer_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export class AuthError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export function authResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}
export function authFailure(error: unknown, operation: Operation = "auth") {
  if (error instanceof AuthError) return authResponse({ error: { code: error.code, message: error.message } }, error.status);
  return failureResponse(error, operation);
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    throw new AuthError(403, "INVALID_ORIGIN", "같은 사이트에서 요청해주세요.");
  }
}
export async function readAuthBody(request: Request) {
  assertSameOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    throw new AuthError(415, "INVALID_CONTENT_TYPE", "JSON으로 요청해주세요.");
  }
  let body: unknown;
  try { body = await request.json(); } catch { throw new AuthError(400, "INVALID_INPUT", "올바른 JSON을 보내주세요."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AuthError(400, "INVALID_INPUT", "입력값을 확인해주세요.");
  return body as Record<string, unknown>;
}

let indexes: Promise<void> | undefined;
async function authDatabase() {
  const db = await getDatabase();
  indexes ??= Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("auth_attempts").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("recommendations").createIndex({ userId: 1, recordDate: 1, createdAt: -1, _id: -1 }),
  ]).then(() => undefined).catch((error) => { indexes = undefined; throw error; });
  await indexes;
  return db;
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
async function verifyPassword(password: string, encoded?: string) {
  const [version, salt, key] = (encoded ?? `scrypt-v1$${"0".repeat(32)}$${"0".repeat(128)}`).split("$");
  if (version !== "scrypt-v1" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(key ?? "")) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(key, "hex")) && !!encoded;
}
function credentials(body: Record<string, unknown>, signup: boolean) {
  if (typeof body.email !== "string" || body.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    throw new AuthError(400, "INVALID_INPUT", "이메일 형식을 확인해주세요.");
  }
  if (typeof body.password !== "string" || body.password.length < (signup ? 10 : 1) || body.password.length > 128) {
    throw new AuthError(400, "INVALID_INPUT", signup ? "비밀번호는 10~128자로 입력해주세요." : "비밀번호를 확인해주세요.");
  }
  return { email: body.email.trim().toLowerCase(), password: body.password };
}
async function limitAttempts(email: string) {
  const db = await authDatabase();
  const windowMs = 15 * 60 * 1000;
  const window = Math.floor(Date.now() / windowMs);
  const _id = hash(`${email}:${window}`);
  const collection = db.collection<Attempt>("auth_attempts");
  let result;
  try {
    result = await collection.findOneAndUpdate({ _id }, {
      $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) },
    }, { upsert: true, returnDocument: "after" });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    result = await collection.findOneAndUpdate({ _id }, { $inc: { count: 1 } }, { returnDocument: "after" });
  }
  if (!result || result.count > 10) throw new AuthError(429, "TOO_MANY_ATTEMPTS", "시도가 너무 많아요. 15분 후 다시 시도해주세요.");
}
export function publicUser(user: User) {
  return { id: user._id, email: user.email, nickname: user.nickname };
}
async function createSession(userId: string) {
  const db = await authDatabase();
  const store = await cookies();
  const old = store.get(COOKIE)?.value;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.collection<Session>("sessions").insertOne({ _id: hash(token), userId, expiresAt });
  if (old) await db.collection<Session>("sessions").deleteOne({ _id: hash(old) });
  store.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS });
}
export async function signup(body: Record<string, unknown>) {
  const { email, password } = credentials(body, true);
  if (typeof body.nickname !== "string" || !body.nickname.trim() || body.nickname.trim().length > 30) {
    throw new AuthError(400, "INVALID_INPUT", "닉네임은 1~30자로 입력해주세요.");
  }
  await limitAttempts(email);
  const db = await authDatabase();
  const user: User = { _id: randomUUID(), email, nickname: body.nickname.trim(), passwordHash: await passwordHash(password), createdAt: new Date() };
  try { await db.collection<User>("users").insertOne(user); }
  catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) throw new AuthError(409, "EMAIL_EXISTS", "이미 가입된 이메일이에요. 로그인해주세요.");
    throw error;
  }
  // 회원가입과 로그인을 분리해 세션 생성 실패로 가입 성공 여부가 모호해지는 것을 방지합니다.
  return publicUser(user);
}
export async function login(body: Record<string, unknown>) {
  const { email, password } = credentials(body, false);
  await limitAttempts(email);
  const db = await authDatabase();
  const user = await db.collection<User>("users").findOne({ email });
  if (!(await verifyPassword(password, user?.passwordHash)) || !user) {
    throw new AuthError(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않아요.");
  }
  await createSession(user._id);
  return publicUser(user);
}
export async function requireUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new AuthError(401, "UNAUTHENTICATED", "로그인이 필요해요.");
  const db = await authDatabase();
  const session = await db.collection<Session>("sessions").findOne({ _id: hash(token), expiresAt: { $gt: new Date() } });
  const user = session ? await db.collection<User>("users").findOne({ _id: session.userId }) : null;
  if (!user) throw new AuthError(401, "UNAUTHENTICATED", "로그인이 필요해요.");
  return publicUser(user);
}
export async function logout() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = await authDatabase();
    await db.collection<Session>("sessions").deleteOne({ _id: hash(token) });
  }
  store.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
