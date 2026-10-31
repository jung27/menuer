"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FoodApiError, foodRequest, notifyFoodsChanged } from "./client";

export default function ImportFoodButton({ publicId }: { publicId: string }) {
  const router = useRouter(), lock = useRef(false);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  async function add() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      await foodRequest(`/api/public-foods/${encodeURIComponent(publicId)}/import`, { method: "POST" });
      notifyFoodsChanged(); router.push("/custom-foods"); router.refresh();
    } catch (cause) {
      if (cause instanceof FoodApiError && cause.status === 401) router.push(`/login?next=${encodeURIComponent(`/custom-foods/explore/${publicId}`)}`);
      else setError(cause instanceof Error ? cause.message : "음식을 추가하지 못했어요.");
    } finally { lock.current = false; setPending(false); }
  }
  return <div><button type="button" className="ac-button ac-primary" disabled={pending} onClick={() => void add()}>{pending ? "추가 중…" : "내 음식에 추가"}</button>{error && <p role="alert" className="ac-error">{error}</p>}</div>;
}
