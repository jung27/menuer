import Link from "next/link";
import { MenuHistoryBrand } from "./MenuHistoryHome";
import "./MenuHistoryHome.css";

// A scoped placeholder keeps the homepage link usable until the recommendation
// team supplies its route. Set MenuHistoryHome's recommendationHref to replace it.
export default function MenuRecommendationEntry() {
  return (
    <div className="mh-page" lang="ko">
      <header className="mh-header">
        <div className="mh-header-inner">
          <MenuHistoryBrand />
          <span className="mh-header-caption">감각으로 고르는 오늘의 메뉴</span>
        </div>
      </header>
      <main className="mh-entry-main">
        <Link href="/" className="mh-back-link">← 메뉴 기록으로 돌아가기</Link>
        <section className="mh-entry-card">
          <span className="mh-entry-mark" aria-hidden="true">＋</span>
          <p className="mh-eyebrow">새로운 메뉴 추천</p>
          <h1>새로운 메뉴를 만날<br />준비 중이에요.</h1>
          <p className="mh-entry-description">
            바삭함, 매움, 달달함…<br />
            감각으로 메뉴를 고르는 공간이 곧 열려요.
          </p>
          <Link href="/" className="mh-return-button">내 메뉴 기록 보기 <span aria-hidden="true">→</span></Link>
        </section>
      </main>
    </div>
  );
}
