"use client";

import { useState } from "react";
import { imageFromFile } from "@/features/custom-foods/client";

// 마이페이지 프로필 사진: 고르면 256px로 줄여서 바로 저장
export default function ProfilePhoto({ avatar: initial }: { avatar: string | null }) {
  const [avatar, setAvatar] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save(image: string | null) {
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? "사진을 저장하지 못했어요.");
      setAvatar(data.avatar);
      window.dispatchEvent(new Event("menuer-auth-change")); // 오른쪽 위 프로필도 갱신
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ac-photo">
      <div className="ac-photo-img">
        {avatar ? <img src={avatar} alt="프로필 사진" className="ac-avatar" /> : <span aria-hidden>👤</span>}
      </div>
      <div className="ac-photo-actions">
        <label>
          {pending ? "저장 중…" : avatar ? "사진 바꾸기" : "사진 추가"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            disabled={pending}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              try {
                await save(await imageFromFile(file, 256));
              } catch (err) {
                setError(err instanceof Error ? err.message : "사진을 읽지 못했어요.");
              }
            }}
          />
        </label>
        {avatar && (
          <button type="button" disabled={pending} onClick={() => save(null)}>
            삭제
          </button>
        )}
        {error && <p role="alert" className="ac-error">{error}</p>}
      </div>
    </div>
  );
}
