import Link from "next/link";
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
  recommendationHref = "/menu-history/new",
}: MenuHistoryHomeProps) {
  const history = sortMenuHistory(records);

  return (
    <div className="mh-page" lang="ko">
      <header className="mh-header">
        <div className="mh-header-inner">
          <MenuHistoryBrand />
          <span className="mh-header-caption">감각으로 고르는 오늘의 메뉴</span>
        </div>
      </header>

      <main id="menu-history-content" className="mh-main">
        <section className="mh-intro" aria-labelledby="menu-history-title">
          <p className="mh-eyebrow">나의 메뉴 다이어리</p>
          <h1 id="menu-history-title">오늘은 어떤 메뉴가 당기나요?</h1>
          <p className="mh-intro-description">
            그날의 감각으로 고른 메뉴, 한 곳에 차곡차곡.
          </p>

          <Link href={recommendationHref} className="mh-add-menu">
            <span className="mh-add-icon" aria-hidden="true">＋</span>
            <span className="mh-add-copy">
              <span className="mh-add-title">메뉴 추가하기</span>
              <span className="mh-add-description">
                지금 끌리는 감각으로 새로운 메뉴를 찾아보세요.
              </span>
            </span>
            <svg className="mh-add-arrow" width="25" height="25" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </section>

        <section className="mh-history-section" aria-labelledby="menu-history-list-title">
          <div className="mh-section-heading">
            <h2 id="menu-history-list-title">내가 고른 메뉴 <span>{history.length}</span></h2>
            <p>최근에 고른 메뉴부터 보여드려요</p>
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
                        <span className="mh-date-detail">{date.year} · {date.weekday}</span>
                      </time>
                      <div className="mh-menu-column">
                        <h3>{record.name}</h3>
                        <p className="mh-chosen-time">{date.time} 선택</p>
                        {record.senses && record.senses.length > 0 && (
                          <ul className="mh-sense-list" aria-label="선택한 감각">
                            {record.senses.slice(0, 2).map((sense) => <li key={sense}>{sense}</li>)}
                          </ul>
                        )}
                      </div>
                      <FoodPhoto name={record.name} imageUrl={record.imageUrl} />
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mh-empty-state">
              <span className="mh-empty-mark" aria-hidden="true">＋</span>
              <h3>아직 고른 메뉴가 없어요</h3>
              <p>위의 메뉴 추가하기를 눌러 첫 메뉴를 찾아볼까요?</p>
            </div>
          )}
        </section>

        <footer className="mh-footer">그날의 느낌을, 다시 꺼내보세요.</footer>
      </main>
    </div>
  );
}
