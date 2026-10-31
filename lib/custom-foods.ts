import "server-only";
import { randomUUID } from "node:crypto";
import { AuthError } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { FoodValidationError, MAX_IMAGE_BYTES, parseCustomFood, type CustomFoodDraft } from "@/features/custom-foods/model";

type FoodDocument = CustomFoodDraft & { _id: string; userId: string; createdAt: Date; updatedAt: Date };
let indexes: Promise<unknown> | undefined;
async function collection() {
  const records = (await getDatabase()).collection<FoodDocument>("custom_foods");
  indexes ??= records.createIndex({ userId: 1, createdAt: -1, _id: -1 }).catch(error => { indexes = undefined; throw error; });
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
  const { _id, userId: _owner, createdAt, updatedAt, ...food } = record;
  return { ...food, id: _id, createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString() };
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
export async function createCustomFood(userId: string, body: unknown) {
  const food = input(body), now = new Date();
  const record = { ...food, _id: randomUUID(), userId, createdAt: now, updatedAt: now };
  await (await collection()).insertOne(record);
  return publicFood(record);
}
export async function updateCustomFood(userId: string, id: string, body: unknown) {
  checkId(id);
  const food = input(body);
  const record = await (await collection()).findOneAndUpdate({ _id: id, userId }, { $set: { ...food, updatedAt: new Date() } }, { returnDocument: "after" });
  if (!record) throw new AuthError(404, "FOOD_NOT_FOUND", "음식을 찾을 수 없어요.");
  return publicFood(record);
}
