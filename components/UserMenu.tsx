"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useCurrentUser } from "@/features/account/useCurrentUser";
import "@/features/account/account.css";

export default function UserMenu() {
  const router = useRouter();
  const { user, error, retry } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  async function logout() {
    setPending(true);
    setLogoutError(false);
    const res = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setPending(false);
    if (!res?.ok) { setLogoutError(true); return; }
    setOpen(false);
    retry();
    window.dispatchEvent(new Event("menuer-auth-change"));
    router.push("/");
    router.refresh();
  }

  if (error) return <button type="button" className="ac-login" onClick={retry}>로그인 확인 재시도</button>;
  if (user === undefined) return <span className="ac-user-loading" role="status" aria-label="로그인 확인 중" />;

  if (!user) {
    return (
      <Link href="/login" className="ac-login">
        로그인
      </Link>
    );
  }

  return (
    <div className="ac-user-menu" ref={container}>
      <button type="button" ref={trigger} className="ac-user-trigger" aria-label="사용자 메뉴" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        {user.avatar ? <img src={user.avatar} alt="" className="ac-avatar" /> : <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
      </button>
      {open && <nav className="ac-dropdown" id={panelId} aria-label="사용자 메뉴">
        <Link href="/mypage" onClick={() => setOpen(false)}>마이페이지</Link>
        <Link href="/custom-foods" onClick={() => setOpen(false)}>사용자 지정 음식</Link>
        <button type="button" onClick={logout} disabled={pending}>{pending ? "로그아웃 중…" : "로그아웃"}</button>
        {logoutError && <p role="alert">로그아웃하지 못했어요. 다시 시도해주세요.</p>}
      </nav>}
    </div>
  );
}
