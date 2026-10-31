"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useState } from "react";
import { AccountShell } from "@/features/account/AccountShell";
import { foodRequest } from "./client";
import { SURFACE_PATTERNS, TASTE_FIELDS, type PublishedFood } from "./model";
import ImportFoodButton from "./ImportFoodButton";
import PageHeading from "@/components/PageHeading";

const FoodPreview = dynamic(() => import("./FoodPreview"), { ssr: false, loading: () => <p className="ac-status">미리보기 준비 중…</p> });
function PublicFoodContent({ publicId }: { publicId: string }) {
  const [food, setFood] = useState<PublishedFood | null>(null), [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    foodRequest<{ food: PublishedFood }>(`/api/public-foods/${encodeURIComponent(publicId)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setFood(data.food); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "음식을 불러오지 못했어요."); });
    return () => controller.abort();
  }, [publicId, attempt]);
  function retry() { setFood(null); setError(""); setAttempt(value => value + 1); }
  return <main className="ac-main"><PageHeading title={food?.name ?? "공유 음식"} backHref="/custom-foods/explore" backLabel="음식 둘러보기" />
    {error ? <div role="alert" className="ac-error">{error} <button onClick={retry}>다시 확인</button></div> : !food ? <p role="status" className="ac-status">불러오는 중…</p> : <>
      <p className="ac-author">{food.authorName}님이 만든 음식</p>
      <div className="ac-public-preview"><div className="ac-preview"><FoodPreview draft={food} /></div><aside className="ac-public-info">{food.image && <Image src={food.image} alt={`${food.name} 그림`} width={180} height={140} unoptimized />}<p>{SURFACE_PATTERNS[food.physics.pattern]} 질감</p><ImportFoodButton publicId={food.id} /></aside></div>
      <section className="ac-editor-section"><h2>감각</h2><dl className="ac-taste-summary">{TASTE_FIELDS.map(tag => <div key={tag}><dt>{tag}</dt><dd>{Math.round(food.tags[tag] * 100)}%</dd></div>)}</dl></section>
    </>}
  </main>;
}

export default function PublicFoodDetail({ publicId }: { publicId: string }) {
  return <AccountShell><PublicFoodContent key={publicId} publicId={publicId} /></AccountShell>;
}
