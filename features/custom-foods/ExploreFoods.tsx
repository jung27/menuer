"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountShell } from "@/features/account/AccountShell";
import { foodRequest } from "./client";
import type { PublishedFood } from "./model";
import FoodTabs from "./FoodTabs";
import FoodThumb from "./FoodThumb";
import ImportFoodButton from "./ImportFoodButton";

export default function ExploreFoods() {
  const router = useRouter(), params = useSearchParams(), query = params.get("q") ?? "";
  const [input, setInput] = useState(query), [foods, setFoods] = useState<PublishedFood[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null), [pending, setPending] = useState(true);
  const [error, setError] = useState(""), [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  useEffect(() => { setInput(query); }, [query]);
  useEffect(() => {
    generation.current++;
    const controller = new AbortController();
    setPending(true); setError(""); setFoods([]); setNextOffset(null);
    foodRequest<{ foods: PublishedFood[]; nextOffset: number | null }>(`/api/public-foods?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(data => { setFoods(data.foods); setNextOffset(data.nextOffset); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "음식을 불러오지 못했어요."); })
      .finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, [query, attempt]);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    router.replace(`/custom-foods/explore${value ? `?q=${encodeURIComponent(value)}` : ""}`);
    if (query === value) setAttempt(value => value + 1);
  }
  async function more() {
    if (pending || nextOffset === null) return;
    setPending(true); setError("");
    const current = generation.current;
    try {
      const data = await foodRequest<{ foods: PublishedFood[]; nextOffset: number | null }>(`/api/public-foods?q=${encodeURIComponent(query)}&offset=${nextOffset}`);
      if (current === generation.current) { setFoods(foods => [...foods, ...data.foods]); setNextOffset(data.nextOffset); }
    } catch (cause) { if (current === generation.current) setError(cause instanceof Error ? cause.message : "다시 시도해주세요."); }
    finally { if (current === generation.current) setPending(false); }
  }
  return <AccountShell><main className="ac-main"><h1 className="ac-title">사용자 지정 음식</h1><FoodTabs active="explore" />
    <form className="ac-search" onSubmit={search}><input className="ac-input" aria-label="음식 이름이나 만든 사람 검색" placeholder="음식 이름이나 만든 사람 검색" maxLength={60} value={input} onChange={event => setInput(event.target.value)} /><button className="ac-button" type="submit">검색</button>{query && <Link className="ac-clear" href="/custom-foods/explore">초기화</Link>}</form>
    {error && <div className="ac-error" role="alert">{error} <button onClick={() => setAttempt(value => value + 1)}>다시 시도</button></div>}
    {pending && !foods.length ? <p className="ac-status" role="status">불러오는 중…</p> : !error && !foods.length ? <p className="ac-empty">{query ? "검색된 음식이 없어요." : "아직 공개된 음식이 없어요."}</p> : null}
    <ul className="ac-explore-grid">{foods.map(food => <li className="ac-explore-card" key={food.id}>
      <Link href={`/custom-foods/explore/${food.id}`} className="ac-explore-heading"><span><strong>{food.name}</strong><small>{food.authorName}님</small></span><FoodThumb food={food} /></Link>
      <div className="ac-explore-actions"><Link className="ac-button" href={`/custom-foods/explore/${food.id}`}>미리보기</Link><ImportFoodButton publicId={food.id} /></div>
    </li>)}</ul>
    {nextOffset !== null && <button type="button" className="ac-more" disabled={pending} onClick={() => void more()}>{pending ? "불러오는 중…" : "더 보기"}</button>}
  </main></AccountShell>;
}
