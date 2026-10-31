"use client";

import { useCallback, useEffect, useState } from "react";
export type CurrentUser = { id: string; email: string; nickname: string };
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => { setError(null); setAttempt(value => value + 1); }, []);
  useEffect(() => {
    window.addEventListener("menuer-auth-change", retry);
    return () => window.removeEventListener("menuer-auth-change", retry);
  }, [retry]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (response.status === 401) { setUser(null); return; }
        if (!response.ok) throw new Error("로그인 상태를 확인하지 못했어요.");
        setUser((await response.json()).user);
      })
      .catch(() => { if (!controller.signal.aborted) setError("로그인 상태를 확인하지 못했어요."); });
    return () => controller.abort();
  }, [attempt]);
  return { user, error, retry };
}
