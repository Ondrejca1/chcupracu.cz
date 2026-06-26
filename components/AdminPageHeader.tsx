import type { ReactNode } from "react";

export function AdminPageHeader({
  actions,
  description,
  eyebrow,
  title
}: {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow: string;
  title: ReactNode;
}) {
  return (
    <div className="admin-page-head">
      <div>
        <span className="admin-kicker">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}
