"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser, type CurrentUser } from "./useCurrentUser";
import "./account.css";

export function AccountShell({ children }: { children: ReactNode }) {
  return <div className="ac-page" lang="ko">{children}</div>;
}
export function RequireAccount({ children }: { children: (user: CurrentUser) => ReactNode }) {
  const { user, error, retry } = useCurrentUser();
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  useEffect(() => {
    if (user === null) router.replace(`/login?next=${encodeURIComponent(pathname + (params.size ? `?${params}` : ""))}`);
  }, [user, router, pathname, params]);
  if (error) return <main className="ac-main"><p className="ac-error" role="alert">{error}</p><button className="ac-button" onClick={retry}>다시 확인</button></main>;
  if (!user) return <main className="ac-main"><p className="ac-status" role="status">로그인 확인 중…</p></main>;
  return children(user);
}
