"use client";

import Link from "next/link";
import { useState } from "react";
import SensoryObject from "@/components/SensoryObject";
import type { Food } from "@/app/food-card/taste";

export default function ShareCard({ menu, from, food }: { menu: string; from: string; food?: Food }) {
  const [value, setValue] = useState(0); // 받은 사람도 카드를 만져 볼 수 있게

  return (
    <>
      <p className="text-center text-lg text-neutral-600">
        {from ? (
          <>
            <b className="text-neutral-900">{from}</b>님이 공유한 메뉴예요
          </>
        ) : (
          "친구가 공유한 메뉴예요"
        )}
      </p>

      <h1 className="text-5xl font-bold text-neutral-900">{menu}</h1>

      {food && (
        <div className="aspect-[3/4] w-full max-w-sm">
          <SensoryObject food={food} value={value} onChange={setValue} />
        </div>
      )}

      <Link
        href="/food-card"
        className="rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white"
      >
        나도 감각으로 메뉴 고르기
      </Link>
    </>
  );
}
