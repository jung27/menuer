"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AccountShell, RequireAccount } from "@/features/account/AccountShell";
import { COLOR_PALETTE, PHYSICS_FIELDS, TASTE_FIELDS, emptyCustomFood, parseCustomFood, type CustomFoodDraft, type CustomFood } from "./model";
import { FoodApiError, foodRequest, imageFromFile, saveFood } from "./client";

const FoodPreview = dynamic(() => import("./FoodPreview"), { ssr: false, loading: () => <p className="ac-status">미리보기 준비 중…</p> });
type NumberKey = keyof typeof PHYSICS_FIELDS;

function Editor() {
  const router = useRouter(), search = useSearchParams(), editId = search.get("edit") || undefined;
  const [draft, setDraft] = useState<CustomFoodDraft>(emptyCustomFood);
  const [loading, setLoading] = useState(!!editId);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [imagePending, setImagePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<"baseColor" | "crackColor">("baseColor");
  const fileInput = useRef<HTMLInputElement>(null);
  const saving = useRef(false);
  const imageVersion = useRef(0);
  useEffect(() => {
    if (!editId) { setDraft(emptyCustomFood()); setLoadError(null); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError(null); setLoadError(null);
    foodRequest<{ food: CustomFood }>(`/api/custom-foods/${encodeURIComponent(editId)}`, { signal: controller.signal })
      .then(({ food }) => setDraft(parseCustomFood(food)))
      .catch(cause => { if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : "음식을 불러오지 못했어요."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [editId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || imagePending || loading) return;
    setError(null);
    let food: CustomFoodDraft;
    try { food = parseCustomFood(draft); } catch (cause) { setError((cause as Error).message); return; }
    saving.current = true; setPending(true);
    try { await saveFood(food, editId); router.push("/custom-foods"); router.refresh(); }
    catch (cause) {
      if (cause instanceof FoodApiError && cause.status === 401) router.replace(`/login?next=${encodeURIComponent("/custom-foods/new" + (editId ? `?edit=${editId}` : ""))}`);
      else setError(cause instanceof FoodApiError ? cause.message : "저장하지 못했어요. 다시 시도해주세요.");
    }
    finally { saving.current = false; setPending(false); }
  }
  function reset() { imageVersion.current++; setImagePending(false); setDraft(emptyCustomFood()); setColorTarget("baseColor"); setError(null); if (fileInput.current) fileInput.current.value = ""; }
  async function upload(file?: File) {
    if (!file) return;
    const version = ++imageVersion.current;
    setImagePending(true); setError(null);
    try { const image = await imageFromFile(file); if (imageVersion.current === version) setDraft(current => ({ ...current, image })); }
    catch (cause) { if (imageVersion.current === version) setError((cause as Error).message); }
    finally { if (imageVersion.current === version) setImagePending(false); }
  }
  function color(key: "baseColor" | "crackColor", value: string) { setDraft(current => ({ ...current, physics: { ...current.physics, [key]: value.toUpperCase() } })); }
  if (loading) return <main className="ac-main"><p className="ac-status" role="status">불러오는 중…</p></main>;
  if (loadError) return <main className="ac-main"><Link className="ac-back" href="/custom-foods">← 사용자 지정 음식</Link><p className="ac-error" role="alert">{loadError}</p></main>;
  return <main className="ac-main ac-editor-main"><Link className="ac-back" href="/custom-foods">← 사용자 지정 음식</Link><h1 className="ac-title">{editId ? "음식 수정" : "음식 추가"}</h1>
    <form onSubmit={event => void submit(event)}>
      {error && <p className="ac-error" role="alert">{error}</p>}
      <fieldset className="ac-fields" disabled={pending}>
        <label className="ac-name-label">이름<input name="name" required maxLength={60} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} placeholder="음식 이름" className="ac-input" /></label>
        <div className="ac-preview-layout"><div className="ac-preview" aria-label="음식 오브제 미리보기"><FoodPreview draft={draft} /></div><div className="ac-actions"><button type="button" className="ac-button" onClick={reset}>초기화</button><button type="submit" className="ac-button ac-primary" disabled={imagePending}>{pending ? "저장 중…" : editId ? "저장" : "추가"}</button><button type="button" className="ac-button" disabled={imagePending} onClick={() => fileInput.current?.click()}>{imagePending ? "그림 준비 중…" : draft.image ? "그림 바꾸기" : "그림 추가"}</button><input ref={fileInput} type="file" className="ac-sr-only" aria-label="음식 그림 선택" accept="image/png,image/jpeg,image/webp" onChange={event => void upload(event.target.files?.[0])} />{draft.image && <div className="ac-uploaded"><Image src={draft.image} alt="선택한 음식 그림" width={96} height={80} unoptimized /><button type="button" onClick={() => { imageVersion.current++; setDraft(current => ({ ...current, image: null })); if (fileInput.current) fileInput.current.value = ""; }}>그림 제거</button></div>}</div></div>
        <section className="ac-editor-section" aria-labelledby="custom-colors"><h2 id="custom-colors">색상</h2><div className="ac-color-targets">{(["baseColor", "crackColor"] as const).map(key => <div key={key} className="ac-color-target"><button type="button" aria-pressed={colorTarget === key} onClick={() => setColorTarget(key)}>{key === "baseColor" ? "겉면" : "속면"}</button><input type="color" aria-label={key === "baseColor" ? "겉면 색상 직접 선택" : "속면 색상 직접 선택"} value={draft.physics[key]} onChange={event => { setColorTarget(key); color(key, event.target.value); }} /><span>{draft.physics[key]}</span></div>)}</div><div className="ac-palette" aria-label={`${colorTarget === "baseColor" ? "겉면" : "속면"} 색상 팔레트`}>{COLOR_PALETTE.map(value => <button key={value} type="button" style={{ background: value }} aria-label={`${value} 색상`} aria-pressed={draft.physics[colorTarget] === value} onClick={() => color(colorTarget, value)} />)}</div></section>
        <section className="ac-editor-section" aria-labelledby="custom-tastes"><h2 id="custom-tastes">맛</h2><div className="ac-sliders">{TASTE_FIELDS.map(tag => <label key={tag} className="ac-slider-label"><span>{tag}<output>{Math.round(draft.tags[tag] * 100)}%</output></span><input type="range" aria-label={tag} min={0} max={100} value={Math.round(draft.tags[tag] * 100)} onChange={event => setDraft(current => ({ ...current, tags: { ...current.tags, [tag]: Number(event.target.value) / 100 } }))} /></label>)}</div></section>
        <section className="ac-editor-section" aria-labelledby="custom-physics"><h2 id="custom-physics">질감 · 움직임</h2><div className="ac-sliders">{(Object.keys(PHYSICS_FIELDS) as NumberKey[]).map(key => { const field = PHYSICS_FIELDS[key]; return <label key={key} className="ac-slider-label"><span>{field.label}<output>{key === "maxStretch" ? `${draft.physics[key].toFixed(2)}배` : `${Math.round(draft.physics[key] * 100)}%`}</output></span><input type="range" aria-label={field.label} min={field.min} max={field.max} step={0.01} value={draft.physics[key]} onChange={event => setDraft(current => ({ ...current, physics: { ...current.physics, [key]: Number(event.target.value) } }))} /></label>; })}</div></section>
      </fieldset>
    </form>
  </main>;
}
export default function CustomFoodEditor() {
  return <AccountShell><RequireAccount>{user => <Editor key={user.id} />}</RequireAccount></AccountShell>;
}
