"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Food } from "@/app/food-card/taste";

const SensoryObject = dynamic(() => import("@/components/SensoryObject"), {
  ssr: false,
  loading: () => <p role="status" className="p-8 text-center text-sm text-neutral-500">불러오는 중…</p>,
});

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed
      ? <p role="alert" className="p-8 text-center text-sm text-neutral-500">말랑이를 불러오지 못했어요. 닫고 다시 열어주세요.</p>
      : this.props.children;
  }
}

function PreviewDialog({ food, onClose }: { food: Food; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [value, setValue] = useState(0);
  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={dialogRef} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-3xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-2xl backdrop:bg-black/40">
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 id={titleId} className="min-w-0 break-words text-xl font-semibold">{food.name}</h2>
      <button type="button" autoFocus onClick={onClose} className="shrink-0 cursor-pointer rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2">닫기</button>
    </div>
    <div className="h-[min(55dvh,380px)] min-h-48 w-full overflow-hidden rounded-2xl bg-neutral-50" aria-label={`${food.name} 말랑이`}>
      <PreviewBoundary><SensoryObject food={food} value={value} onChange={setValue} showInfo={false} /></PreviewBoundary>
    </div>
    <p className="mt-4 text-center text-xs text-neutral-500">눌러보거나 드래그해 보세요.</p>
  </dialog>;
}

export default function SharedMealPreview({ food, mealLabel }: { food: Food; mealLabel: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-label={`${mealLabel} ${food.name} 메뉴 보기`} aria-haspopup="dialog" onClick={() => setOpen(true)}
      className="ml-auto shrink-0 cursor-pointer rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 sm:text-sm">메뉴 보기</button>
    {open && <PreviewDialog food={food} onClose={() => setOpen(false)} />}
  </>;
}
