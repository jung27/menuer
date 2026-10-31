"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonClass, inputClass, postAuth } from "./auth";
import { loginDestination } from "@/lib/login-destination";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const err = await postAuth("/api/auth/login", {
      email: form.get("email"),
      password: form.get("password"),
    });
    setPending(false);
    if (err) return setError(err);
    router.replace(loginDestination(window.location.search));
    router.refresh(); // 로그인 상태가 반영되도록
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 p-6">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8"
      >
        <h1 className="text-2xl font-bold text-neutral-900">로그인</h1>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          이메일
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          비밀번호
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button disabled={pending} className={buttonClass}>
          {pending ? "로그인 중..." : "로그인"}
        </button>
        <p className="text-center text-sm text-neutral-500">
          계정이 없나요?{" "}
          <Link href="/login/signup" className="font-medium text-neutral-900 underline">
            회원가입
          </Link>
        </p>
      </form>
    </main>
  );
}
