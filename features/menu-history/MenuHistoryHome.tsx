import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import DailyMenuList from "./DailyMenuList";
import "./MenuHistoryHome.css";

type MenuHistoryHomeProps = {
  /** Change this when the team's recommendation route is ready. */
  recommendationHref?: string;
};

export function MenuHistoryBrand() {
  return (
    <Link href="/" className="mh-brand" aria-label="메뉴얼 홈">
      <span className="mh-brand-mark" aria-hidden="true">m.</span>
      <span>메뉴얼</span>
    </Link>
  );
}

export default function MenuHistoryHome({
  recommendationHref = "/food-card",
}: MenuHistoryHomeProps) {
  return (
    <div className="mh-page" lang="ko">
      <header className="mh-header">
        <div className="mh-header-inner">
          <MenuHistoryBrand />
          <UserMenu />
        </div>
      </header>

      <main id="menu-history-content" className="mh-main">
        <h1 id="menu-history-title" className="mh-daily-title">식사 기록</h1>
        <DailyMenuList recommendationHref={recommendationHref} />
      </main>
    </div>
  );
}
