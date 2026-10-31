import { Suspense } from "react";
import ExploreFoods from "@/features/custom-foods/ExploreFoods";

export default function Page() {
  return <Suspense fallback={<p className="ac-status">불러오는 중…</p>}><ExploreFoods /></Suspense>;
}
