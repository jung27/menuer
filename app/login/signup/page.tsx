"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLink from "@/components/AuthLink";
import { authPageHref } from "@/lib/login-destination";
import { buttonClass, inputClass, postAuth } from "../auth";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const err = await postAuth("/api/auth/signup", {
      email: form.get("email"),
      password: form.get("password"),
      nickname: form.get("nickname"),
    });
    if (err) { setPending(false); setError(err); return; }
    router.replace(authPageHref("/login", window.location.search)); // 가입 후 로그인하면서 원래 화면으로 복귀
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 p-6">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-8"
      >
        <h1 className="site-page-title">회원가입</h1>

        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          이메일
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          닉네임
          <input
            name="nickname"
            required
            maxLength={30}
            autoComplete="nickname"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-600">
          비밀번호
          <input
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            aria-describedby="password-hint"
            className={inputClass}
          />
          <span id="password-hint" className="text-xs text-neutral-400">
            10자 이상 128자 이하
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button disabled={pending} className={buttonClass}>
          {pending ? "가입 중..." : "가입하기"}
        </button>
        <p className="text-center text-sm text-neutral-500">
          이미 계정이 있나요?{" "}
          <AuthLink href="/login" className="font-medium text-neutral-900 underline">
            로그인
          </AuthLink>
        </p>
      </form>
    </main>
  );
}
