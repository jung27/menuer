import { Suspense } from "react";
import MyPage from "@/features/account/MyPage";

export default function MyAccountPage() {
  return <Suspense fallback={<p role="status">불러오는 중…</p>}><MyPage /></Suspense>;
}
