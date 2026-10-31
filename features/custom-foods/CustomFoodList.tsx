"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, RequireAccount } from "@/features/account/AccountShell";
import { FoodApiError, foodRequest } from "./client";
import type { CustomFood } from "./model";
import FoodTabs from "./FoodTabs";
import FoodThumb from "./FoodThumb";
import DeleteFoodDialog from "./DeleteFoodDialog";

function FoodList({ userId }: { userId: string }) {
  const router = useRouter();
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [pending, setPending] = useState(true);
  const [busy, setBusy] = useState<string[]>([]);
  const locks = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<CustomFood | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setPending(true); setError(null); setAttempt(value => value + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
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
    window.addEventListener("menuer-foods-change", refresh);
    return () => window.removeEventListener("menuer-foods-change", refresh);
  }, [refresh]);

  async function settings(food: CustomFood, patch: { recommendationEnabled?: boolean; published?: boolean }) {
    if (locks.current.has(food.id)) return;
    locks.current.add(food.id); setBusy([...locks.current]); setError(null);
    try {
      const data = await foodRequest<{ food: CustomFood }>(`/api/custom-foods/${food.id}/settings`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
      });
      setFoods(current => current.map(item => item.id === food.id ? data.food : item));
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
  async function remove() {
    if (!deleteTarget || locks.current.has(deleteTarget.id)) return;
    const food = deleteTarget;
    locks.current.add(food.id); setBusy([...locks.current]); setDeleteError(null);
    try {
      await foodRequest<{ deleted: boolean }>(`/api/custom-foods/${food.id}`, { method: "DELETE" });
      setFoods(current => current.filter(item => item.id !== food.id));
      setNextOffset(current => current === null ? null : Math.max(0, current - 1));
      setDeleteTarget(null);
    } catch (cause) {
      if (cause instanceof FoodApiError && cause.status === 401) router.replace("/login?next=%2Fcustom-foods");
      else setDeleteError(cause instanceof Error ? cause.message : "삭제하지 못했어요. 다시 시도해주세요.");
    } finally { locks.current.delete(food.id); setBusy([...locks.current]); }
  }
  return <main className="ac-main"><h1 className="ac-title">사용자 지정 음식</h1><FoodTabs active="mine" />
    <Link href="/custom-foods/new" className="ac-add"><span>＋ 음식 추가</span><span aria-hidden="true">→</span></Link>
    {error && <div className="ac-error" role="alert">{error} <button type="button" onClick={refresh}>다시 시도</button></div>}
    {pending && foods.length === 0 ? <p className="ac-status" role="status">불러오는 중…</p> : !error && foods.length === 0 ? <div className="ac-empty">아직 만든 음식이 없어요.</div> : null}
    <ul className="ac-food-list">{foods.map(food => <li key={food.id}><article className="ac-food-item" aria-label={food.name}>
      <Link href={`/custom-foods/new?edit=${encodeURIComponent(food.id)}`} className="ac-food-row"><span className="ac-food-name">{food.name}{food.source && <small>{food.source.authorName}님에게서 가져옴</small>}</span><FoodThumb food={food} /></Link>
      <div className="ac-food-controls" aria-busy={busy.includes(food.id)}><div className="ac-food-switches">
        <label className="ac-switch-label">추천에 포함<button type="button" role="switch" aria-label={`${food.name} 추천에 포함`} aria-checked={food.recommendationEnabled} disabled={busy.includes(food.id)} className="ac-switch" onClick={() => void settings(food, { recommendationEnabled: !food.recommendationEnabled })}><span /><span className="ac-sr-only">{food.recommendationEnabled ? "ON" : "OFF"}</span></button></label>
        <label className="ac-switch-label">다른 사람에게 공개<button type="button" role="switch" aria-label={`${food.name} 다른 사람에게 공개`} aria-checked={food.published} disabled={busy.includes(food.id)} className="ac-switch" onClick={() => void settings(food, { published: !food.published })}><span /><span className="ac-sr-only">{food.published ? "ON" : "OFF"}</span></button></label>
        </div>
        <div className="ac-row-actions">
          <Link href={`/custom-foods/new?edit=${encodeURIComponent(food.id)}`}>수정</Link><button type="button" className="ac-delete-action" aria-label={`${food.name} 삭제`} disabled={pending || busy.includes(food.id)} onClick={() => { setDeleteError(null); setDeleteTarget(food); }}>삭제</button></div>
      </div>
    </article></li>)}</ul>
    {nextOffset !== null && <button type="button" className="ac-more" disabled={pending || deleteTarget !== null} onClick={() => void more()}>{pending ? "불러오는 중…" : "더 보기"}</button>}
    {deleteTarget && <DeleteFoodDialog name={deleteTarget.name} pending={busy.includes(deleteTarget.id)} error={deleteError} onCancel={() => setDeleteTarget(null)} onDelete={() => void remove()} />}
  </main>;
}
export default function CustomFoodList() {
  return <AccountShell><RequireAccount>{user => <FoodList key={user.id} userId={user.id} />}</RequireAccount></AccountShell>;
}
