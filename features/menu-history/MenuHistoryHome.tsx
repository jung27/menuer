import PageHeading from "@/components/PageHeading";
import DailyMenuList from "./DailyMenuList";
import "./MenuHistoryHome.css";

type MenuHistoryHomeProps = {
  /** Change this when the team's recommendation route is ready. */
  recommendationHref?: string;
};

export { SiteBrand as MenuHistoryBrand } from "@/components/SiteHeader";

export default function MenuHistoryHome({
  recommendationHref = "/food-card",
}: MenuHistoryHomeProps) {
  return (
    <div className="mh-page" lang="ko">
      <main id="menu-history-content" className="mh-main">
        <PageHeading id="menu-history-title" title="식사 기록" />
        <DailyMenuList recommendationHref={recommendationHref} />
      </main>
    </div>
  );
}
