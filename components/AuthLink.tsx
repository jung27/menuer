"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { authPageHref } from "@/lib/login-destination";

type Props = { href: "/login" | "/login/signup"; children: ReactNode; className?: string };

function DestinationLink({ href, ...props }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const search = pathname === "/login" || pathname === "/login/signup"
    ? params.toString()
    : new URLSearchParams({ next: pathname + (params.size ? `?${params}` : "") }).toString();
  return <Link {...props} href={authPageHref(href, search)} />;
}

export default function AuthLink(props: Props) {
  return <Suspense fallback={<Link {...props} />}><DestinationLink {...props} /></Suspense>;
}
