import Link from "next/link";
import UserMenu from "./UserMenu";

export function SiteBrand() {
  return <Link href="/" className="site-brand" aria-label="메뉴얼 홈">
    <span className="site-brand-mark" aria-hidden="true">m.</span>
    <span>메뉴얼</span>
  </Link>;
}

export default function SiteHeader() {
  return <header className="site-header"><div className="site-header-inner">
    <SiteBrand />
    <UserMenu />
  </div></header>;
}
