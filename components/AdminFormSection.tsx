import type { ReactNode } from "react";

export function AdminFormSection({
  children,
  description,
  title
}: {
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="admin-card admin-form-section">
      <div className="admin-card-head">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
