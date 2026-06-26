"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export function AdminNavLink({ children, exact, href }: { children: ReactNode; exact?: boolean; href: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hrefPath, hrefSearch] = href.split("?");
  const currentWithSearch = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
  const isJobSection = hrefPath === "/admin/jobs" && !hrefSearch;
  const isActive = exact
    ? hrefSearch
      ? currentWithSearch === href
      : pathname === hrefPath
    : isJobSection
      ? pathname === hrefPath || (pathname.startsWith("/admin/jobs/") && pathname !== "/admin/jobs/new")
      : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);

  return (
    <Link className={isActive ? "active" : undefined} href={href}>
      {children}
    </Link>
  );
}
