import { Suspense } from "react";
import CustomFoodList from "@/features/custom-foods/CustomFoodList";

export default function CustomFoodsPage() {
  return <Suspense fallback={<p role="status">불러오는 중…</p>}><CustomFoodList /></Suspense>;
}
