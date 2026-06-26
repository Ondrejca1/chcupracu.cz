import type { ReactNode } from "react";

type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export function AdminStatusPill({
  children,
  icon,
  tone = "neutral"
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span className={`status-pill tone-${tone}`}>
      {icon}
      {children}
    </span>
  );
}
