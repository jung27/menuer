import Image from "next/image";
import Link from "next/link";
import UserMenu from "./UserMenu";

export function SiteBrand() {
  return <Link href="/" className="site-brand" aria-label="손마카세 홈">
    <span className="site-brand-mark" aria-hidden="true">
      <Image src="/brand/sonmakase.png" alt="" width={160} height={160} sizes="48px" draggable={false} />
    </span>
    <span className="site-brand-name">손마카세</span>
  </Link>;
}

export default function SiteHeader() {
  return <header className="site-header"><div className="site-header-inner">
    <SiteBrand />
    <UserMenu />
  </div></header>;
}
