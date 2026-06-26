import type { ReactNode } from "react";

export function AdminToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={["admin-toolbar", className ?? ""].filter(Boolean).join(" ")}>{children}</section>;
}
