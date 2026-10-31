"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type User = { id: string; email: string; nickname: string };

// 헤더 오른쪽용: 로그인했으면 인사말 + 로그아웃, 아니면 로그인 링크.
export default function UserMenu() {
  const router = useRouter();
  // undefined: 확인 중 또는 서버 오류(AUTH.md: 503은 미로그인으로 취급하지 않음), null: 미로그인
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) setUser((await res.json()).user);
        else if (res.status === 401) setUser(null);
      })
      .catch(() => {});
  }, []);

  async function logout() {
    setPending(true);
    const res = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setPending(false);
    if (!res?.ok) return;
    setUser(null);
    router.refresh();
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium text-neutral-900 underline">
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-neutral-700">
        <b className="font-semibold text-neutral-900">{user.nickname}</b>님, 오늘 뭐 드실래요?
      </span>
      <button
        onClick={logout}
        disabled={pending}
        className="rounded-full border border-neutral-300 px-3 py-1.5 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
      >
        로그아웃
      </button>
    </div>
  );
}
