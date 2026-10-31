import "server-only";
import { createHash } from "node:crypto";
import { getDatabase } from "@/lib/mongodb";
import { recommendMenus, type SensationValues } from "@/lib/recommendations";

export type RecommendationRecord = {
  _id: string;
  visitorId?: string;
  userId: string;
  requestId: string;
  createdAt: Date;
  recordDate: string;
  inputKind?: "interactionMs" | "tasteScores";
  tasteScores?: SensationValues | null;
  interactionMs: SensationValues | null;
  totalInteractionMs: number | null;
  ratios: SensationValues;
  recommendations: ReturnType<typeof recommendMenus>;
  algorithmVersion: string;
  catalogVersion: string;
};

export function koreaDate(date: Date) {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function recordsCollection() {
  const db = await getDatabase();
  return db.collection<RecommendationRecord>("recommendations");
}

export async function saveRecommendation(input: Omit<RecommendationRecord,
  "_id" | "createdAt" | "recordDate" | "algorithmVersion" | "catalogVersion">) {
  const records = await recordsCollection();
  // 기본 _id 고유 인덱스로 같은 사용자+requestId의 동시 요청도 중복 저장하지 않습니다.
  const id = createHash("sha256").update(JSON.stringify(["account", input.userId, input.requestId])).digest("hex");
  const createdAt = new Date();
  const record: RecommendationRecord = {
    ...input, _id: id, createdAt, recordDate: koreaDate(createdAt),
    algorithmVersion: input.inputKind === "tasteScores" ? "food-card-cosine-v1" : "weighted-v1",
    catalogVersion: input.inputKind === "tasteScores" ? "food-card-v1" : "sample-v1",
  };
  try {
    await records.updateOne({ _id: id }, { $setOnInsert: record }, { upsert: true });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
  }
  const saved = await records.findOne({ _id: id, userId: input.userId });
  if (!saved) throw new Error("Record was not saved.");
  return saved;
}

export function publicRecord(record: RecommendationRecord) {
  return {
    recordId: record._id, requestId: record.requestId,
    createdAt: record.createdAt.toISOString(), recordDate: record.recordDate,
    mode: record.inputKind === "tasteScores" ? "cosine" : "weighted", saved: true,
    inputKind: record.inputKind ?? "interactionMs", tasteScores: record.tasteScores ?? null,
    algorithmVersion: record.algorithmVersion, catalogVersion: record.catalogVersion,
    interactionMs: record.interactionMs, totalInteractionMs: record.totalInteractionMs,
    ratios: record.ratios, recommendations: record.recommendations,
  };
}
