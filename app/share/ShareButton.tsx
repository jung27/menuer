"use client";

import { useEffect, useState } from "react";

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
  className = "",
  ...rest
}: { menu: string; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [nickname, setNickname] = useState("");
  const [status, setStatus] = useState<"" | "copied" | "failed">("");

  useEffect(() => {
    // 공유 창은 클릭 직후에 바로 열어야 해서 닉네임을 미리 받아 둠
    getNickname().then(setNickname);
  }, []);

  async function share() {
    const params = new URLSearchParams({ menu });
    if (nickname) params.set("from", nickname);
    const url = `${location.origin}/share?${params}`;

    if (navigator.share) {
      // 사용자가 공유 창을 닫아도 오류가 나므로 무시
      await navigator.share({ title: "메뉴얼", text: `오늘은 ${menu} 어때요?`, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <button {...rest} onClick={share} className={className} aria-label={`${menu} 공유하기`}>
      {status === "copied" ? "링크 복사됨" : status === "failed" ? "복사 실패" : "공유"}
    </button>
  );
}
