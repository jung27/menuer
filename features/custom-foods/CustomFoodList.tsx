"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell, RequireAccount } from "@/features/account/AccountShell";
import { FoodApiError, foodRequest } from "./client";
import type { CustomFood } from "./model";

function FoodList({ userId }: { userId: string }) {
  const router = useRouter();
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setPending(true); setError(null);
    foodRequest<{ foods: CustomFood[]; nextOffset: number | null }>("/api/custom-foods", { signal: controller.signal })
      .then(data => { setFoods(data.foods); setNextOffset(data.nextOffset); })
      .catch(error => {
        if (controller.signal.aborted) return;
        if (error instanceof FoodApiError && error.status === 401) router.replace("/login?next=%2Fcustom-foods");
        else setError("음식을 불러오지 못했어요. 다시 시도해주세요.");
      }).finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [userId, attempt, router]);
  async function more() {
    if (pending || nextOffset === null) return;
    setPending(true); setError(null);
    try {
      const data = await foodRequest<{ foods: CustomFood[]; nextOffset: number | null }>(`/api/custom-foods?offset=${nextOffset}`);
      setFoods(current => [...current, ...data.foods]); setNextOffset(data.nextOffset);
    } catch { setError("음식을 불러오지 못했어요. 다시 시도해주세요."); }
    finally { setPending(false); }
  }
  return <main className="ac-main"><h1 className="ac-title">사용자 지정 음식</h1><Link href="/custom-foods/new" className="ac-add"><span>＋ 음식 추가</span><span aria-hidden="true">→</span></Link>
    {error && <div className="ac-error" role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 시도</button></div>}
    {pending && foods.length === 0 ? <p className="ac-status" role="status">불러오는 중…</p> : !error && foods.length === 0 ? <div className="ac-empty">아직 만든 음식이 없어요.</div> : null}
    <ul className="ac-food-list">{foods.map(food => <li key={food.id}><Link href={`/custom-foods/new?edit=${encodeURIComponent(food.id)}`} className="ac-food-row"><span className="ac-food-name">{food.name}</span><span className="ac-food-thumb">{food.image ? <Image src={food.image} alt={`${food.name} 그림`} fill unoptimized sizes="96px" /> : <span className="ac-food-symbol" style={{ background: food.physics.baseColor, borderColor: food.physics.crackColor }} aria-label="음식 색상" />}</span></Link></li>)}</ul>
    {nextOffset !== null && <button type="button" className="ac-more" disabled={pending} onClick={() => void more()}>{pending ? "불러오는 중…" : "더 보기"}</button>}
  </main>;
}
export default function CustomFoodList() {
  return <AccountShell><RequireAccount>{user => <FoodList key={user.id} userId={user.id} />}</RequireAccount></AccountShell>;
}
