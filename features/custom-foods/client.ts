import type { CustomFoodDraft, CustomFood } from "./model";

export class FoodApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function foodRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...options });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new FoodApiError(response.status, data?.error?.message ?? "음식을 불러오지 못했어요. 다시 시도해주세요.");
  if (!data || typeof data !== "object") throw new FoodApiError(502, "서버 응답을 확인하지 못했어요. 다시 시도해주세요.");
  return data as T;
}
export function notifyFoodsChanged() { window.dispatchEvent(new Event("menuer-foods-change")); }
export async function saveFood(draft: CustomFoodDraft, id?: string) {
  const result = await foodRequest<{ food: CustomFood }>(id ? `/api/custom-foods/${encodeURIComponent(id)}` : "/api/custom-foods", {
    method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
  });
  notifyFoodsChanged();
  return result;
}
export async function imageFromFile(file: File, maxSide = 512): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("PNG, JPG, WEBP 파일을 8MB 이하로 선택해주세요.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("그림을 읽지 못했어요.")); image.src = url; });
    if (image.naturalWidth * image.naturalHeight > 25000000) throw new Error("그림의 크기를 줄여서 다시 선택해주세요.");
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/webp", 0.82);
    if (result.length > 460000) throw new Error("그림의 크기를 줄여서 다시 선택해주세요.");
    return result;
  } finally { URL.revokeObjectURL(url); }
}
