import Link from "next/link";
import { Bell, CheckCircle2, ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { getAdminNotifications } from "@/lib/admin-notifications";
import { requirePermission } from "@/lib/auth";

const toneLabels = {
  danger: "Urgentní",
  warning: "Ke kontrole",
  info: "Info"
} as const;

export default async function AdminNotificationsPage() {
  await requirePermission("dashboard:view");
  const notifications = await getAdminNotifications();

  return (
    <AdminShell>
      <AdminPageHeader
        actions={<Link className="button secondary" href="/admin/tasks">Otevřít úkoly redakce</Link>}
        description="Jedno místo pro věci, které vyžadují pozornost redakce, obchodu nebo financí."
        eyebrow="Centrum provozu"
        title="Upozornění"
      />

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><Bell size={22} /><span>Celkem</span><strong>{notifications.total}</strong><small>aktivních upozornění</small></article>
        <article className="admin-stat"><span>Urgentní</span><strong>{notifications.urgent}</strong><small>reakce, schvalování, publikace</small></article>
        <article className="admin-stat"><span>Reakce</span><strong>{notifications.counts.newApplications}</strong><small>nové odpovědi uchazečů</small></article>
        <article className="admin-stat"><span>Schvalování</span><strong>{notifications.counts.clientReviewJobs}</strong><small>klientská podání</small></article>
        <article className="admin-stat"><span>Finance</span><strong>{notifications.counts.unpaidInvoices}</strong><small>nezaplacené faktury</small></article>
      </section>

      {notifications.items.length === 0 ? (
        <section className="admin-card success-card">
          <CheckCircle2 size={24} />
          <div>
            <h2>Všechno je klidné</h2>
            <p>Žádné nové reakce, schvalování, fakturační rozpory ani reklamní problémy teď nevyžadují zásah.</p>
          </div>
        </section>
      ) : (
        <section className="admin-notification-list">
          {notifications.items.map((item) => (
            <Link className={`admin-notification-card tone-${item.tone}`} href={item.href} key={item.id}>
              <div>
                <div className="admin-notification-meta">
                  <AdminStatusPill tone={item.tone}>{toneLabels[item.tone]}</AdminStatusPill>
                  <span>{item.category}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
              </div>
              <strong>{item.count}</strong>
              <span className="admin-notification-open">Otevřít <ExternalLink size={15} /></span>
            </Link>
          ))}
        </section>
      )}

    </AdminShell>
  );
}
