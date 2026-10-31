"use client";

import Link from "next/link";
import { AccountShell, RequireAccount } from "./AccountShell";
import PageHeading from "@/components/PageHeading";
import ProfilePhoto from "./ProfilePhoto";

export default function MyPage() {
  return <AccountShell><RequireAccount>{user => <main className="ac-main"><PageHeading title="마이페이지" backHref="/" backLabel="홈" /><ProfilePhoto avatar={user.avatar} /><dl className="ac-profile"><div><dt>닉네임</dt><dd>{user.nickname}</dd></div><div><dt>이메일</dt><dd>{user.email}</dd></div></dl><Link href="/custom-foods" className="ac-add">사용자 지정 음식 <span aria-hidden="true">→</span></Link></main>}</RequireAccount></AccountShell>;
}
