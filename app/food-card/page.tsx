import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AuthError, requireUser } from "@/lib/auth";
import FoodCardClient from "./FoodCardClient";
import { FOODS } from "./foods";
import { shuffle } from "./shuffle";
import { reportFailure } from "@/lib/server-failure";

export default function FoodCardPage(props: PageProps<"/food-card">) {
  return <Suspense fallback={<p className="p-8 text-center">로그인 확인 중...</p>}>
    <AuthenticatedFoodCard {...props} />
  </Suspense>;
}

async function AuthenticatedFoodCard({ searchParams }: PageProps<"/food-card">) {
  // 세션 만료 여부는 실제 요청 시점에 검사합니다.
  await connection();
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["date", "meal"]) {
    if (typeof params[key] === "string") query.set(key, params[key]);
  }
  const destination = `/food-card${query.size ? `?${query}` : ""}`;
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      redirect(`/login?next=${encodeURIComponent(destination)}`);
    }
    const failure = reportFailure(error, "food-card");
    return <p role="alert" className="p-8 text-center">{failure.error.message}</p>;
  }
  return <FoodCardClient initialFoods={shuffle(FOODS)} />;
}
