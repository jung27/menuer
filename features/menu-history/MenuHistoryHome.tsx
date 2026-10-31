import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import FoodPhoto from "./FoodPhoto";
import {
  formatHistoryDate,
  previewMenuHistory,
  sortMenuHistory,
  type MenuHistoryRecord,
} from "./history-data";
import "./MenuHistoryHome.css";

type MenuHistoryHomeProps = {
  records?: readonly MenuHistoryRecord[];
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
  records = previewMenuHistory,
  recommendationHref = "/food-card",
}: MenuHistoryHomeProps) {
  const history = sortMenuHistory(records);

  return (
    <div className="mh-page" lang="ko">
      <header className="mh-header">
        <div className="mh-header-inner">
          <MenuHistoryBrand />
          <UserMenu />
        </div>
      </header>

      <main id="menu-history-content" className="mh-main">
        <h1 id="menu-history-title" className="mh-sr-only">메뉴 기록</h1>
        <section aria-label="메뉴 추가">
          <Link href={recommendationHref} className="mh-add-menu">
            <span className="mh-add-icon" aria-hidden="true">＋</span>
            <span className="mh-add-title">메뉴 추가</span>
            <svg className="mh-add-arrow" width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </section>

        <section className="mh-history-section" aria-labelledby="menu-history-list-title">
          <div className="mh-section-heading">
            <h2 id="menu-history-list-title">최근 기록</h2>
          </div>

          {history.length > 0 ? (
            <ol className="mh-history-list">
              {history.map((record) => {
                const date = formatHistoryDate(record.chosenAt);

                return (
                  <li key={record.id}>
                    <article className="mh-history-card" aria-label={`${date.fullDate} ${record.name}`}>
                      <time className="mh-date-column" dateTime={record.chosenAt}>
                        <span className="mh-date-number">{date.date}</span>
                        <span className="mh-date-detail">{date.year}</span>
                      </time>
                      <div className="mh-menu-column">
                        <h3>{record.name}</h3>
                      </div>
                      <FoodPhoto name={record.name} imageUrl={record.imageUrl} />
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mh-empty-state">
              <p>아직 기록이 없어요.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
