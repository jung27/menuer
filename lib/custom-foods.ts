import "server-only";
import { randomUUID } from "node:crypto";
import { AuthError } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { FoodValidationError, MAX_IMAGE_BYTES, parseCustomFood, type CustomFoodDraft } from "@/features/custom-foods/model";
import type { Food } from "@/app/food-card/taste";

type FoodDocument = CustomFoodDraft & {
  _id: string; userId: string; createdAt: Date; updatedAt: Date;
  recommendationEnabled?: boolean; published?: boolean; publicId?: string;
  authorName?: string; publishedAt?: Date; sourcePublicId?: string; sourceAuthorName?: string;
};
let indexes: Promise<unknown> | undefined;
async function collection() {
  const records = (await getDatabase()).collection<FoodDocument>("custom_foods");
  indexes ??= Promise.all([
    records.createIndex({ userId: 1, createdAt: -1, _id: -1 }),
    records.createIndex({ publicId: 1 }, { unique: true, partialFilterExpression: { publicId: { $type: "string" } } }),
    records.createIndex({ userId: 1, sourcePublicId: 1 }, { unique: true, partialFilterExpression: { sourcePublicId: { $type: "string" } } }),
    records.createIndex({ published: 1, publishedAt: -1, _id: -1 }),
  ]).catch(error => { indexes = undefined; throw error; });
  await indexes;
  return records;
}
function input(body: unknown) {
  try {
    const draft = parseCustomFood(body);
    if (draft.image) {
      const bytes = Buffer.from(draft.image.split(",")[1], "base64");
      const mime = draft.image.slice(5, draft.image.indexOf(";"));
      const valid = mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
      if (!valid || bytes.length > MAX_IMAGE_BYTES) throw new FoodValidationError("그림 파일을 다시 선택해주세요.");
    }
    return draft;
  } catch (error) {
    if (error instanceof FoodValidationError) throw new AuthError(400, "INVALID_FOOD", error.message);
    throw error;
  }
}
function publicFood(record: FoodDocument) {
  return {
    ...parseCustomFood(record), id: record._id,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
    recommendationEnabled: record.recommendationEnabled !== false, published: record.published === true,
    publicId: record.publicId ?? null,
    source: record.sourcePublicId ? { id: record.sourcePublicId, authorName: record.sourceAuthorName ?? "익명" } : null,
  };
}
function publishedFood(record: FoodDocument) {
  return { ...parseCustomFood(record), id: record.publicId!, authorName: record.authorName ?? "익명", publishedAt: (record.publishedAt ?? record.createdAt).toISOString() };
}
function checkId(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
}
export async function listCustomFoods(userId: string, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new AuthError(400, "INVALID_OFFSET", "목록 위치를 확인해주세요.");
  const items = await (await collection()).find({ userId }).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(21).toArray();
  return { foods: items.slice(0, 20).map(publicFood), nextOffset: items.length > 20 ? offset + 20 : null };
}
export async function getCustomFood(userId: string, id: string) {
  checkId(id);
  const record = await (await collection()).findOne({ _id: id, userId });
  if (!record) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
  return publicFood(record);
}
export async function deleteCustomFood(userId: string, id: string) {
  checkId(id);
  const result = await (await collection()).deleteOne({ _id: id, userId });
  if (!result.deletedCount) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
}
export async function createCustomFood(userId: string, body: unknown) {
  const food = input(body), now = new Date();
  const record = { ...food, _id: randomUUID(), userId, recommendationEnabled: true, published: false, createdAt: now, updatedAt: now };
  await (await collection()).insertOne(record);
  return publicFood(record);
}

export async function updateFoodSettings(user: { id: string; nickname: string }, id: string, body: Record<string, unknown>) {
  checkId(id);
  const keys = Object.keys(body);
  if (!keys.length || keys.some(key => !["recommendationEnabled", "published"].includes(key) || typeof body[key] !== "boolean")) {
    throw new AuthError(400, "INVALID_SETTINGS", "추천 포함·공개 여부를 확인해주세요.");
  }
  const records = await collection();
  const current = await records.findOne({ _id: id, userId: user.id });
  if (!current) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
  const values: Partial<FoodDocument> = { updatedAt: new Date() };
  if (typeof body.recommendationEnabled === "boolean") values.recommendationEnabled = body.recommendationEnabled;
  if (typeof body.published === "boolean") {
    values.published = body.published;
    if (body.published) {
      values.publicId = current.publicId ?? randomUUID();
      values.authorName = user.nickname;
      values.publishedAt = current.publishedAt ?? new Date();
    }
  }
  const record = await records.findOneAndUpdate({ _id: id, userId: user.id }, { $set: values }, { returnDocument: "after" });
  if (!record) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
  return publicFood(record);
}

export async function listPublishedFoods(query: string, offset: number) {
  if (query.length > 60 || !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new AuthError(400, "INVALID_SEARCH", "검색어와 목록 위치를 확인해주세요.");
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const search = escaped ? { $or: [{ name: { $regex: escaped, $options: "i" } }, { authorName: { $regex: escaped, $options: "i" } }] } : {};
  const rows = await (await collection()).find({ published: true, ...search }).sort({ publishedAt: -1, _id: -1 }).skip(offset).limit(21).toArray();
  return { foods: rows.slice(0, 20).map(publishedFood), nextOffset: rows.length > 20 ? offset + 20 : null };
}
export async function getPublishedFood(id: string) {
  checkId(id);
  const record = await (await collection()).findOne({ publicId: id, published: true });
  if (!record) throw new AuthError(404, "FOOD_NOT_FOUND", "공개된 음식을 찾을 수 없어요.");
  return publishedFood(record);
}
export async function importPublishedFood(userId: string, publicId: string) {
  checkId(publicId);
  const records = await collection();
  const original = await records.findOne({ publicId, published: true });
  if (!original) throw new AuthError(404, "FOOD_NOT_FOUND", "공개된 음식을 찾을 수 없어요.");
  if (original.userId === userId) return { food: publicFood(original), imported: false };
  const existing = await records.findOne({ userId, sourcePublicId: publicId });
  if (existing) return { food: publicFood(existing), imported: false };
  const now = new Date();
  const copy: FoodDocument = {
    ...input(original), _id: randomUUID(), userId, createdAt: now, updatedAt: now,
    recommendationEnabled: true, published: false, sourcePublicId: publicId, sourceAuthorName: original.authorName ?? "익명",
  };
  try { await records.insertOne(copy); }
  catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    const duplicate = await records.findOne({ userId, sourcePublicId: publicId });
    if (!duplicate) throw error;
    return { food: publicFood(duplicate), imported: false };
  }
  return { food: publicFood(copy), imported: true };
}
export async function customRecommendationFoods(userId: string): Promise<Food[]> {
  const rows = await (await collection()).find({ userId, recommendationEnabled: { $ne: false } }, { projection: { _id: 1, name: 1, tags: 1 } }).toArray();
  return rows.map(row => ({ id: `custom:${row._id}`, name: row.name, tags: row.tags }));
}
export async function customCardFoods(userId: string): Promise<Food[]> {
  const rows = await (await collection()).find({ userId, recommendationEnabled: { $ne: false } }, {
    projection: { _id: 1, name: 1, tags: 1, physics: 1, image: 1 },
  }).sort({ createdAt: -1, _id: -1 }).toArray();
  return rows.map(row => {
    const draft = parseCustomFood(row);
    return { id: `custom:${row._id}`, name: draft.name, tags: draft.tags, customConfig: draft.physics, image: draft.image };
  });
}
export async function updateCustomFood(userId: string, id: string, body: unknown) {
  checkId(id);
  const food = input(body);
  const record = await (await collection()).findOneAndUpdate({ _id: id, userId }, { $set: { ...food, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!record) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
  return publicFood(record);
}
