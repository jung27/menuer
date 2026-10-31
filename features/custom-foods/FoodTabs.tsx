import Link from "next/link";

export default function FoodTabs({ active }: { active: "mine" | "explore" }) {
  return <nav className="ac-tabs" aria-label="사용자 지정 음식 탐색">
    <Link href="/custom-foods" aria-current={active === "mine" ? "page" : undefined}>내 음식</Link>
    <Link href="/custom-foods/explore" aria-current={active === "explore" ? "page" : undefined}>음식 둘러보기</Link>
  </nav>;
}
