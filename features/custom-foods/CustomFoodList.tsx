"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, RequireAccount } from "@/features/account/AccountShell";
import { FoodApiError, foodRequest } from "./client";
import type { CustomFood } from "./model";
import FoodTabs from "./FoodTabs";
import FoodThumb from "./FoodThumb";

function FoodList({ userId }: { userId: string }) {
  const router = useRouter();
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [pending, setPending] = useState(true);
  const [busy, setBusy] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPending(true); setError(null);
    foodRequest<{ foods: CustomFood[]; nextOffset: number | null }>("/api/custom-foods", { signal: controller.signal })
      .then(data => { setFoods(data.foods); setNextOffset(data.nextOffset); })
      .catch(cause => {
        if (controller.signal.aborted) return;
        if (cause instanceof FoodApiError && cause.status === 401) router.replace("/login?next=%2Fcustom-foods");
        else setError("음식을 불러오지 못했어요. 다시 시도해주세요.");
      }).finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [userId, attempt, router]);
  useEffect(() => {
    const refresh = () => setAttempt(value => value + 1);
    window.addEventListener("menuer-foods-change", refresh);
    return () => window.removeEventListener("menuer-foods-change", refresh);
  }, []);

  async function settings(food: CustomFood, patch: { recommendationEnabled?: boolean; published?: boolean }) {
    if (locks.current.has(food.id)) return;
    locks.current.add(food.id); setBusy([...locks.current]); setError(null); setStatus("");
    try {
      const data = await foodRequest<{ food: CustomFood }>(`/api/custom-foods/${food.id}/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      setFoods(current => current.map(item => item.id === food.id ? data.food : item));
      setStatus(patch.published !== undefined ? (patch.published ? "음식 둘러보기에 공개했어요." : "음식 공개를 취소했어요.") : "추천 설정을 저장했어요.");
    } catch (cause) {
      if (cause instanceof FoodApiError && cause.status === 401) router.replace("/login?next=%2Fcustom-foods");
      else setError(cause instanceof Error ? cause.message : "설정을 저장하지 못했어요.");
    } finally { locks.current.delete(food.id); setBusy([...locks.current]); }
  }
  async function more() {
    if (pending || nextOffset === null) return;
    setPending(true); setError(null);
    try {
      const data = await foodRequest<{ foods: CustomFood[]; nextOffset: number | null }>(`/api/custom-foods?offset=${nextOffset}`);
      setFoods(current => [...current, ...data.foods]); setNextOffset(data.nextOffset);
    } catch { setError("음식을 불러오지 못했어요. 다시 시도해주세요."); }
    finally { setPending(false); }
  }
  return <main className="ac-main"><h1 className="ac-title">사용자 지정 음식</h1><FoodTabs active="mine" />
    <Link href="/custom-foods/new" className="ac-add"><span>＋ 음식 추가</span><span aria-hidden="true">→</span></Link>
    {error && <div className="ac-error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 시도</button></div>}
    <p className="ac-feedback" role="status">{status}</p>
    {pending && foods.length === 0 ? <p className="ac-status" role="status">불러오는 중…</p> : !error && foods.length === 0 ? <div className="ac-empty">아직 만든 음식이 없어요.</div> : null}
    <ul className="ac-food-list">{foods.map(food => <li key={food.id}><article className="ac-food-item" aria-label={food.name}>
      <Link href={`/custom-foods/new?edit=${encodeURIComponent(food.id)}`} className="ac-food-row"><span className="ac-food-name">{food.name}{food.source && <small>{food.source.authorName}님에게서 가져옴</small>}</span><FoodThumb food={food} /></Link>
      <div className="ac-food-controls"><label className="ac-switch-label">추천에 포함<button type="button" role="switch" aria-label={`${food.name} 추천에 포함`} aria-checked={food.recommendationEnabled} disabled={busy.includes(food.id)} className="ac-switch" onClick={() => void settings(food, { recommendationEnabled: !food.recommendationEnabled })}><span /><span className="ac-sr-only">{food.recommendationEnabled ? "ON" : "OFF"}</span></button></label>
        <div className="ac-row-actions">{food.published && food.publicId && <Link className="ac-published" href={`/custom-foods/explore/${food.publicId}`}>공개 중 ↗</Link>}
          <Link href={`/custom-foods/new?edit=${encodeURIComponent(food.id)}`}>수정</Link><button type="button" disabled={busy.includes(food.id)} onClick={() => void settings(food, { published: !food.published })}>{food.published ? "공개 취소" : "공개하기"}</button></div>
      </div>
    </article></li>)}</ul>
    {nextOffset !== null && <button type="button" className="ac-more" disabled={pending} onClick={() => void more()}>{pending ? "불러오는 중…" : "더 보기"}</button>}
  </main>;
}
export default function CustomFoodList() {
  return <AccountShell><RequireAccount>{user => <FoodList key={user.id} userId={user.id} />}</RequireAccount></AccountShell>;
}
