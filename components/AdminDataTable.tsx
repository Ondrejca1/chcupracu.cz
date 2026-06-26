import type { ReactNode } from "react";

export function AdminDataTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={["admin-table-wrap", className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}
