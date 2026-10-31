"use client";

import { useEffect, useRef } from "react";

export default function DeleteFoodDialog({ name, pending, error, onCancel, onDelete }: {
  name: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={ref} className="ac-delete-dialog" aria-labelledby="delete-food-title" aria-describedby="delete-food-description"
    onCancel={event => { event.preventDefault(); if (!pending) onCancel(); }}>
    <h2 id="delete-food-title">음식을 삭제할까요?</h2>
    <p id="delete-food-description"><strong>{name}</strong>이(가) 내 목록과 공개 목록에서 삭제돼요. 삭제한 음식은 복구할 수 없어요.</p>
    {error && <p className="ac-error" role="alert">{error}</p>}
    {pending && <p className="ac-feedback" role="status">삭제하는 중…</p>}
    <div className="ac-dialog-actions">
      <button type="button" className="ac-button" autoFocus disabled={pending} onClick={onCancel}>취소</button>
      <button type="button" className="ac-button ac-danger" disabled={pending} onClick={onDelete}>{pending ? "삭제 중…" : "삭제"}</button>
    </div>
  </dialog>;
}
