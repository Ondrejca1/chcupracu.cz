import type { ReactNode } from "react";

export function AdminEmptyState({ action, text, title }: { action?: ReactNode; text: string; title: string }) {
  return (
    <div className="admin-empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
      {action}
    </div>
  );
}
