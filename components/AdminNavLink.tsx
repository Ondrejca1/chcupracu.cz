"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AdminNavLink({ children, exact, href }: { children: ReactNode; exact?: boolean; href: string }) {
  const pathname = usePathname();
  const isJobSection = href === "/admin/jobs";
  const isActive = exact
    ? pathname === href
    : isJobSection
      ? pathname === href || (pathname.startsWith("/admin/jobs/") && pathname !== "/admin/jobs/new")
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link className={isActive ? "active" : undefined} href={href}>
      {children}
    </Link>
  );
}
