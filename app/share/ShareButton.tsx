"use client";

import { useEffect, useState } from "react";
import type { ShareFeedback, ShareStatus } from "@/features/sharing/useShareFeedbackGroup";

// 로그인 닉네임은 버튼이 여러 개여도 한 번만 물어봄
let nicknameOnce: Promise<string> | undefined;
const getNickname = () =>
  (nicknameOnce ??= fetch("/api/auth/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => d?.user?.nickname ?? "")
    .catch(() => ""));

// 메뉴 하나를 /share 링크로 공유. 폰은 공유 창, 컴퓨터는 링크 복사.
export default function ShareButton({
  menu,
  label = "공유",
  className = "",
  feedback,
  ...rest
}: { menu: string; label?: string; className?: string; feedback?: ShareFeedback } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [nickname, setNickname] = useState("");
  const [localStatus, setLocalStatus] = useState<ShareStatus>("idle");
  const status = feedback?.status ?? localStatus;

  useEffect(() => {
    // 공유 창은 클릭 직후에 바로 열어야 해서 닉네임을 미리 받아 둠
    getNickname().then(setNickname);
  }, []);

  async function share() {
    const finish = feedback?.begin() ?? setLocalStatus;
    if (!feedback) setLocalStatus("idle");
    const params = new URLSearchParams({ menu });
    if (nickname) params.set("from", nickname);
    const url = `${location.origin}/share?${params}`;

    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      // 문구(text)를 같이 보내면 일부 메신저가 링크 끝에 붙여 이름(from)에 섞임 → 링크만 보냄
      try { await navigator.share({ title: `오늘은 ${menu} 어때요?`, url }); return; }
      catch (cause) {
        // 취소는 그대로 닫고, 공유 기능을 사용할 수 없을 때는 링크 복사로 이어집니다.
        if (cause instanceof Error && cause.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      finish("copied");
    } catch {
      finish("failed");
    }
  }

  return (
    <button {...rest} onClick={share} className={className} aria-label={`${menu} 공유하기`}>
      {status === "copied" ? "링크 복사됨" : status === "failed" ? "복사 실패" : label}
    </button>
  );
}
