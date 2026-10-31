import Link from "next/link";

export default function PageHeading({ title, id, backHref, backLabel }: {
  title: string;
  id?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return <div className="site-page-heading">
    <h1 id={id} className="site-page-title">{title}</h1>
    {backHref && <Link className="site-back-link" href={backHref}>← {backLabel ?? "뒤로"}</Link>}
  </div>;
}
