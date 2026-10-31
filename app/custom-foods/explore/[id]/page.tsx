import { Suspense } from "react";
import PublicFoodDetail from "@/features/custom-foods/PublicFoodDetail";

export default function Page({ params }: PageProps<"/custom-foods/explore/[id]">) {
  return <Suspense fallback={<p className="ac-status">불러오는 중…</p>}><Detail params={params} /></Suspense>;
}
async function Detail({ params }: Pick<PageProps<"/custom-foods/explore/[id]">, "params">) {
  const { id } = await params;
  return <PublicFoodDetail publicId={id} />;
}
