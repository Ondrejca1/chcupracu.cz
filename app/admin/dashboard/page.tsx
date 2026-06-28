import Link from "next/link";
import { AdPlacementStatus, ApplicationStatus, JobStatus, PaymentStatus } from "@prisma/client";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CircleDollarSign,
  FilePlus2,
  Inbox,
  Megaphone,
  Newspaper,
  Plus,
  Send,
  UsersRound
} from "lucide-react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { dateCs, dateTimeCs, money } from "@/lib/format";
import { hasPermission, requirePermission, type AdminPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentIssue, getFeaturedAds } from "@/lib/queries";
import {
  activeAdWhere,
  activeJobWhere,
  adStatusLabels,
  applicationStatusLabels,
  expiringJobWhere,
  jobStatusLabels,
  syncExpiredBusinessState
} from "@/lib/business-rules";
import { getAdminNotifications } from "@/lib/admin-notifications";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";

const quickActions = [
  { title: "Nový inzerát", href: "/admin/jobs/new", icon: FilePlus2, permission: "jobs:write" },
  { title: "Firmy", href: "/admin/companies", icon: Building2, permission: "companies:write" },
  { title: "Reakce", href: "/admin/applications", icon: Inbox, permission: "applications:write" },
  { title: "Finance", href: "/admin/finance", icon: CircleDollarSign, permission: "finance:write" },
  { title: "Jalovec", href: "/admin/jalovec", icon: Newspaper, permission: "jalovec:write" },
  { title: "Reklamy", href: "/admin/ads", icon: Megaphone, permission: "ads:write" }
] satisfies Array<{ title: string; href: string; icon: typeof FilePlus2; permission: AdminPermission }>;

function jobStatusTone(status: JobStatus): Tone {
  if (status === JobStatus.ACTIVE) return "success";
  if (status === JobStatus.PENDING_PAYMENT || status === JobStatus.DRAFT) return "warning";
  if (status === JobStatus.EXPIRED || status === JobStatus.ARCHIVED) return "danger";
  return "neutral";
}

function applicationStatusTone(status: ApplicationStatus): Tone {
  if (status === ApplicationStatus.HIRED || status === ApplicationStatus.FORWARDED) return "success";
  if (status === ApplicationStatus.CONTACTED || status === ApplicationStatus.WAITING) return "info";
  if (status === ApplicationStatus.REJECTED) return "danger";
  return "warning";
}

function adStatusTone(status: AdPlacementStatus): Tone {
  if (status === AdPlacementStatus.ACTIVE) return "success";
  if (status === AdPlacementStatus.RESERVED || status === AdPlacementStatus.AVAILABLE) return "info";
  if (status === AdPlacementStatus.PAUSED) return "warning";
  return "danger";
}

export default async function AdminDashboardPage() {
  const admin = await requirePermission("dashboard:view");
  await syncExpiredBusinessState();
  const now = new Date();

  const [
    activeJobs,
    draftJobs,
    expiringJobs,
    latestApplications,
    latestJobs,
    currentIssue,
    featuredAds,
    activeAds,
    unpaidInvoices,
    paidRevenue,
    monthRevenue,
    totalViews,
    latestActivities,
    notifications
  ] = await Promise.all([
    prisma.jobPost.count({ where: activeJobWhere(now) }),
    prisma.jobPost.count({ where: { status: JobStatus.DRAFT } }),
    prisma.jobPost.count({ where: expiringJobWhere(now) }),
    prisma.application.findMany({
      select: {
        id: true,
        jobId: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        job: { select: { title: true, company: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.jobPost.findMany({
      include: {
        company: true,
        city: true,
        invoices: { select: { status: true }, orderBy: { issuedAt: "desc" }, take: 1 },
        _count: { select: { applications: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    getCurrentIssue(),
    getFeaturedAds(4),
    prisma.adPlacement.count({ where: activeAdWhere(now) }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.UNPAID }, _sum: { amountCzk: true }, _count: true }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amountCzk: true } }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.PAID, paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } }, _sum: { amountCzk: true } }),
    prisma.jobPost.aggregate({ _sum: { views: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    getAdminNotifications()
  ]);

  const widgets = [
    {
      title: "Inzeráty",
      value: activeJobs,
      label: "aktivní",
      detail: `${draftJobs} konceptů`,
      href: "/admin/jobs",
      tone: "success" as Tone,
      icon: BriefcaseBusiness
    },
    {
      title: "Schvalování",
      value: notifications.counts.clientReviewJobs,
      label: "čeká",
      detail: "klientská podání",
      href: "/admin/jobs?view=client-review",
      tone: notifications.counts.clientReviewJobs > 0 ? "danger" as Tone : "neutral" as Tone,
      icon: Send
    },
    {
      title: "Reakce",
      value: notifications.counts.newApplications,
      label: "nové",
      detail: "uchazeči k vyřízení",
      href: "/admin/applications?status=NEW",
      tone: notifications.counts.newApplications > 0 ? "danger" as Tone : "neutral" as Tone,
      icon: UsersRound
    },
    {
      title: "Finance",
      value: money(unpaidInvoices._sum.amountCzk),
      label: "nezaplaceno",
      detail: `${unpaidInvoices._count} položek`,
      href: "/admin/finance?status=UNPAID",
      tone: unpaidInvoices._count > 0 ? "warning" as Tone : "success" as Tone,
      icon: CircleDollarSign
    },
    {
      title: "Obnova",
      value: expiringJobs,
      label: "končí",
      detail: "do 7 dní",
      href: "/admin/jobs?view=expiring",
      tone: expiringJobs > 0 ? "warning" as Tone : "neutral" as Tone,
      icon: CalendarClock
    },
    {
      title: "Reklamy",
      value: activeAds,
      label: "aktivní",
      detail: "běžící pozice",
      href: "/admin/ads",
      tone: "info" as Tone,
      icon: Megaphone
    }
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        actions={<Link className="button" href="/admin/jobs/new"><Plus size={18} /> Přidat inzerát</Link>}
        description="Co je potřeba vyřídit, kde jsou peníze, co běží a co brzy končí."
        eyebrow="Přehled redakce"
        title="Dashboard"
      />

      <section className="dashboard-priority-grid">
        <article className="admin-card dashboard-priority-card">
          <div className="dashboard-widget-head">
            <div>
              <span className="admin-kicker">Priorita</span>
              <h2>Co řešit teď</h2>
            </div>
            <strong>{notifications.total}</strong>
          </div>
          <div className="dashboard-priority-list">
            {notifications.items.slice(0, 5).map((item) => (
              <Link className={`dashboard-priority-item tone-${item.tone}`} href={item.href} key={item.id}>
                <AdminStatusPill tone={item.tone}>{item.category}</AdminStatusPill>
                <span>{item.title}</span>
                <strong>{item.count}</strong>
              </Link>
            ))}
            {notifications.items.length === 0 && (
              <div className="dashboard-clear-state">
                <AdminStatusPill tone="success">Klid</AdminStatusPill>
                <span>Teď není žádná urgentní položka.</span>
              </div>
            )}
          </div>
          <Link className="button secondary compact" href="/admin/notifications"><Bell size={16} /> Všechna upozornění</Link>
        </article>

        <article className="admin-card dashboard-actions-card">
          <div className="dashboard-widget-head">
            <div>
              <span className="admin-kicker">Rychle otevřít</span>
              <h2>Pracovní zkratky</h2>
            </div>
          </div>
          <div className="dashboard-action-grid">
            {quickActions.filter((action) => hasPermission(admin, action.permission)).map((action) => {
              const Icon = action.icon;
              return (
                <Link className="dashboard-action-button" href={action.href} key={action.href}>
                  <Icon size={18} />
                  <span>{action.title}</span>
                </Link>
              );
            })}
          </div>
        </article>
      </section>

      <section className="dashboard-widget-grid" aria-label="Stav systému">
        {widgets.map((item) => {
          const Icon = item.icon;
          return (
            <Link className={`dashboard-widget tone-${item.tone}`} href={item.href} key={item.title}>
              <div>
                <Icon size={20} />
                <span>{item.title}</span>
              </div>
              <strong>{item.value}</strong>
              <small>{item.label} · {item.detail}</small>
            </Link>
          );
        })}
      </section>

      <section className="dashboard-work-grid">
        <article className="admin-card dashboard-list-widget">
          <div className="admin-card-head">
            <div>
              <h2>Inzeráty</h2>
              <p>Nejnovější nabídky a jejich stav.</p>
            </div>
            <Link className="admin-link" href="/admin/jobs">Všechny</Link>
          </div>
          <div className="admin-list compact">
            {latestJobs.map((job) => (
              <Link className="admin-list-row dashboard-row" href={`/admin/jobs/${job.id}/edit`} key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.company.name} · {job.city.name} · {job._count.applications} reakcí</span>
                </div>
                <AdminStatusPill tone={jobStatusTone(job.status)}>{jobStatusLabels[job.status]}</AdminStatusPill>
              </Link>
            ))}
          </div>
        </article>

        <article className="admin-card dashboard-list-widget">
          <div className="admin-card-head">
            <div>
              <h2>Reakce</h2>
              <p>Nové odpovědi uchazečů.</p>
            </div>
            <Link className="admin-link" href="/admin/applications">Zpracovat</Link>
          </div>
          <div className="admin-list compact">
            {latestApplications.map((application) => (
              <Link className="admin-list-row dashboard-row" href={`/admin/applications?job=${application.jobId}`} key={application.id}>
                <div>
                  <strong>{application.name}</strong>
                  <span>{application.job.title} · {application.job.company.name}</span>
                </div>
                <AdminStatusPill tone={applicationStatusTone(application.status)}>{applicationStatusLabels[application.status]}</AdminStatusPill>
              </Link>
            ))}
            {latestApplications.length === 0 && <p className="admin-empty">Zatím nepřišly žádné reakce.</p>}
          </div>
        </article>

        <article className="admin-card dashboard-list-widget">
          <div className="admin-card-head">
            <div>
              <h2>Finance a výkon</h2>
              <p>Rychlá kontrola peněz a návštěvnosti.</p>
            </div>
            <Link className="admin-link" href="/admin/finance">Finance</Link>
          </div>
          <div className="dashboard-mini-metrics">
            <div><span>Zaplaceno</span><strong>{money(paidRevenue._sum.amountCzk)}</strong></div>
            <div><span>Tento měsíc</span><strong>{money(monthRevenue._sum.amountCzk)}</strong></div>
            <div><span>Zobrazení</span><strong>{totalViews._sum.views ?? 0}</strong></div>
          </div>
          <div className="admin-feature-box compact">
            <span>Aktuální Jalovec</span>
            <strong>{currentIssue?.title ?? "Není nastavené"}</strong>
            <small>{currentIssue ? dateCs(currentIssue.publishedAt) : "Doplňte v sekci Jalovec"}</small>
          </div>
        </article>

        <article className="admin-card dashboard-list-widget">
          <div className="admin-card-head">
            <div>
              <h2>Reklama</h2>
              <p>Aktivní obchodní sloty.</p>
            </div>
            <Link className="admin-link" href="/admin/ads">Spravovat</Link>
          </div>
          <div className="admin-list compact">
            {featuredAds.map((ad) => (
              <div className="admin-list-row dashboard-row" key={ad.id}>
                <div>
                  <strong>{ad.name}</strong>
                  <span>{ad.location} · {money(ad.priceCzk)}</span>
                </div>
                <AdminStatusPill tone={adStatusTone(ad.status)}>{adStatusLabels[ad.status]}</AdminStatusPill>
              </div>
            ))}
            {featuredAds.length === 0 && <p className="admin-empty">Zatím není vybraná žádná reklamní pozice.</p>}
          </div>
        </article>
      </section>

      <section className="admin-card dashboard-activity-widget">
        <div className="admin-card-head">
          <div>
            <h2>Poslední změny</h2>
            <p>Kdo co v adminu naposledy upravil.</p>
          </div>
        </div>
        <div className="admin-list compact">
          {latestActivities.map((activity) => (
            <div className="admin-list-row dashboard-row" key={activity.id}>
              <div>
                <strong>{activity.summary}</strong>
                <span>{activity.actorEmail ?? "admin"} · {activity.entityType}</span>
              </div>
              <em>{dateTimeCs(activity.createdAt)}</em>
            </div>
          ))}
          {latestActivities.length === 0 && <p className="admin-empty">Zatím tu není žádná historie změn.</p>}
        </div>
      </section>
    </AdminShell>
  );
}
