import { Suspense } from "react";
import CustomFoodEditor from "@/features/custom-foods/CustomFoodEditor";

export default function NewCustomFoodPage() {
  return <Suspense fallback={<p role="status">불러오는 중…</p>}><CustomFoodEditor /></Suspense>;
}
