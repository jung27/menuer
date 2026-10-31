import type { Taste } from "@/app/food-card/taste";
import type { SensoryPhysicsProps, SurfacePatternType } from "@/components/SensoryObject";

export const TASTE_FIELDS = ["매운맛", "단맛", "짠맛", "기름짐", "국물", "바삭함"] as const satisfies readonly (keyof Taste)[];
type Physics = Required<SensoryPhysicsProps>;
type PhysicsNumber = Exclude<keyof Physics, "baseColor" | "crackColor" | "pattern">;
export const SURFACE_PATTERNS = {
  fried: "튀김", meat: "고기", noodle: "면", tteok: "떡", rice: "밥", bread: "빵", broth: "국물", fresh: "채소",
} as const satisfies Record<SurfacePatternType, string>;
export const PHYSICS_FIELDS: Record<PhysicsNumber, { label: string; min: number; max: number }> = {
  squish: { label: "말랑함", min: 0, max: 1 },
  hardness: { label: "단단함", min: 0, max: 1 },
  viscosity: { label: "점성 · 질김", min: 0, max: 1 },
  maxStretch: { label: "최대 늘어남", min: 0.3, max: 2 },
  crack: { label: "껍질 · 바삭한 파쇄", min: 0, max: 1 },
  shake: { label: "진동", min: 0, max: 1 },
  fluidity: { label: "묽기 · 출렁임", min: 0, max: 1 },
  inflate: { label: "부풀어 오름", min: 0, max: 1 },
  steam: { label: "김 · 뜨거움", min: 0, max: 1 },
  boil: { label: "끓는 기포", min: 0, max: 1 },
  redness: { label: "열기에 붉어짐", min: 0, max: 1 },
  roughness: { label: "표면 거칠기", min: 0, max: 1 },
  glossiness: { label: "광택", min: 0, max: 1 },
};
export const COLOR_PALETTE = [
  "#FFFFFF", "#E5E7EB", "#9CA3AF", "#4B5563", "#1F2937", "#111111", "#FFF7E0", "#F5D0A9", "#D8A46C", "#854D27",
  "#FEE2E2", "#FCA5A5", "#F87171", "#EF4444", "#B91C1C", "#7F1D1D", "#FED7AA", "#FB923C", "#EA580C", "#92400E",
  "#FEF3C7", "#FDE047", "#EAB308", "#A3E635", "#4ADE80", "#16A34A", "#166534", "#5EEAD4", "#14B8A6", "#0F766E",
  "#BAE6FD", "#38BDF8", "#2563EB", "#1E3A8A", "#C4B5FD", "#8B5CF6", "#6B21A8", "#F5D0FE", "#F472B6", "#BE185D",
] as const;

export type CustomFoodDraft = { name: string; tags: Taste; physics: Physics; image: string | null };
export type CustomFood = CustomFoodDraft & {
  id: string; createdAt: string; updatedAt: string;
  recommendationEnabled: boolean; published: boolean; publicId: string | null;
  source: { id: string; authorName: string } | null;
};
export type PublishedFood = CustomFoodDraft & {
  id: string; authorName: string; publishedAt: string;
};
export const MAX_IMAGE_BYTES = 350000;
export function emptyCustomFood(): CustomFoodDraft {
  return {
    name: "", tags: Object.fromEntries(TASTE_FIELDS.map(tag => [tag, 0])) as Taste, image: null,
    physics: { baseColor: "#D8A46C", crackColor: "#FFF7E0", pattern: "meat", squish: 0.5, hardness: 0.5,
      viscosity: 0.5, maxStretch: 1, crack: 0, shake: 0, fluidity: 0, inflate: 0.2,
      steam: 0, boil: 0, redness: 0, roughness: 0.3, glossiness: 0.5 },
  };
}
export class FoodValidationError extends Error {}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FoodValidationError("음식 설정을 확인해주세요.");
  return value as Record<string, unknown>;
}
export function parseCustomFood(input: unknown): CustomFoodDraft {
  const body = object(input), tags = object(body.tags), physics = object(body.physics);
  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 60) throw new FoodValidationError("이름은 1~60자로 입력해주세요.");
  const result = emptyCustomFood();
  result.name = body.name.trim();
  // Previously saved foods did not have a surface pattern.
  if (physics.pattern !== undefined) {
    if (typeof physics.pattern !== "string" || !Object.hasOwn(SURFACE_PATTERNS, physics.pattern)) throw new FoodValidationError("질감 종류를 확인해주세요.");
    result.physics.pattern = physics.pattern as SurfacePatternType;
  }
  for (const tag of TASTE_FIELDS) {
    const value = tags[tag];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new FoodValidationError(`${tag} 값을 확인해주세요.`);
    result.tags[tag] = value;
  }
  for (const [key, { label, min, max }] of Object.entries(PHYSICS_FIELDS)) {
    const value = physics[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new FoodValidationError(`${label} 값을 확인해주세요.`);
    result.physics[key as PhysicsNumber] = value;
  }
  for (const key of ["baseColor", "crackColor"] as const) {
    if (typeof physics[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(physics[key])) throw new FoodValidationError("색상을 확인해주세요.");
    result.physics[key] = (physics[key] as string).toUpperCase();
  }
  if (body.image !== null && body.image !== undefined) {
    if (typeof body.image !== "string" || body.image.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 80
      || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(body.image)) throw new FoodValidationError("그림 파일을 다시 선택해주세요.");
    result.image = body.image;
  }
  return result;
}
