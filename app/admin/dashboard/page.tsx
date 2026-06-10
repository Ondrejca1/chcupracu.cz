import Link from "next/link";
import { ApplicationStatus, JobStatus, PaymentStatus } from "@prisma/client";
import { AlertTriangle, ArrowUpRight, BarChart3, BriefcaseBusiness, CalendarClock, CircleDollarSign, FilePlus2, Inbox, Megaphone, Newspaper, Plus, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, dateTimeCs, money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentIssue, getFeaturedAds } from "@/lib/queries";
import { activeAdWhere, activeJobWhere, expiringJobWhere, jobStatusLabels, syncExpiredBusinessState } from "@/lib/business-rules";
import { getOperationalWarnings } from "@/lib/admin-insights";

const dashboardTiles = [
  {
    title: "Přidat pracovní inzerát",
    text: "Kompletní zadání včetně mzdy, obrázků, topování a zobrazení na homepage.",
    href: "/admin/jobs/new",
    icon: FilePlus2
  },
  {
    title: "Aktuální číslo Jalovce",
    text: "Vyměnit obálku, odkaz a poznámky k právě propagovanému vydání.",
    href: "/admin/jalovec",
    icon: Newspaper
  },
  {
    title: "Reakce uchazečů",
    text: "Zpracovat nové odpovědi, změnit stav a předat kontakt správné firmě.",
    href: "/admin/applications",
    icon: Inbox
  },
  {
    title: "Reklamní plocha",
    text: "Zadat partnera, cenu, délku kampaně, dostupné sloty a stav kampaně.",
    href: "/admin/ads",
    icon: Megaphone
  },
  {
    title: "Číselníky a finance",
    text: "Správa měst, balíčků, faktur a základních ekonomických filtrů.",
    href: "/admin/finance",
    icon: CircleDollarSign
  }
];

export default async function AdminDashboardPage() {
  await requireAdmin();
  await syncExpiredBusinessState();
  const now = new Date();

  const [
    activeJobs,
    draftJobs,
    expiringJobs,
    newApplications,
    unpaidInvoices,
    currentIssue,
    latestApplications,
    latestJobs,
    featuredAds,
    activeAds,
    paidRevenue,
    monthRevenue,
    totalViews,
    latestActivities,
    warnings
  ] = await Promise.all([
    prisma.jobPost.count({ where: activeJobWhere(now) }),
    prisma.jobPost.count({ where: { status: JobStatus.DRAFT } }),
    prisma.jobPost.count({ where: expiringJobWhere(now) }),
    prisma.application.count({ where: { status: ApplicationStatus.NEW } }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.UNPAID }, _sum: { amountCzk: true }, _count: true }),
    getCurrentIssue(),
    prisma.application.findMany({
      select: {
        id: true,
        jobId: true,
        name: true,
        email: true,
        createdAt: true,
        job: { select: { title: true, company: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.jobPost.findMany({
      include: { company: true, city: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    getFeaturedAds(4),
    prisma.adPlacement.count({ where: activeAdWhere(now) }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amountCzk: true } }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.PAID, paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } }, _sum: { amountCzk: true } }),
    prisma.jobPost.aggregate({ _sum: { views: true } }),
    prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    getOperationalWarnings()
  ]);

  const stats = [
    { label: "Aktivní inzeráty", value: activeJobs, hint: `${draftJobs} konceptů`, icon: BriefcaseBusiness },
    { label: "Končí do 7 dní", value: expiringJobs, hint: "vhodné obnovit nebo topovat", icon: CalendarClock },
    { label: "Nové reakce", value: newApplications, hint: "čekají na zpracování", icon: UsersRound },
    { label: "Nezaplacené faktury", value: money(unpaidInvoices._sum.amountCzk), hint: `${unpaidInvoices._count} položek`, icon: BarChart3 },
    { label: "Aktivní reklamy", value: activeAds, hint: "běžící reklamní pozice", icon: Megaphone },
    { label: "Zaplacené celkem", value: money(paidRevenue._sum.amountCzk), hint: `${money(monthRevenue._sum.amountCzk)} tento měsíc`, icon: CircleDollarSign },
    { label: "Zobrazení inzerátů", value: totalViews._sum.views ?? 0, hint: "součet detailů nabídek", icon: BarChart3 }
  ];

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Přehled redakce</span>
          <h1>Dashboard</h1>
          <p>Rychlý provozní pohled na inzeráty, reakce, finance, Jalovec a reklamní plochy.</p>
        </div>
        <Link className="button" href="/admin/jobs/new">
          <Plus size={18} /> Přidat inzerát
        </Link>
      </div>

      <section className="admin-stat-grid">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article className="admin-stat" key={item.label}>
              <Icon size={22} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </article>
          );
        })}
      </section>

      <section className="admin-tile-grid">
        {dashboardTiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link className="admin-action-tile" href={tile.href} key={tile.title}>
              <Icon size={24} />
              <strong>{tile.title}</strong>
              <span>{tile.text}</span>
              <small className="admin-action-cta">
                Otevřít <ArrowUpRight size={14} />
              </small>
            </Link>
          );
        })}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Poslední inzeráty</h2>
              <p>Stav, lokalita a rychlý přechod do editace.</p>
            </div>
            <Link className="admin-link" href="/admin/jobs">Všechny</Link>
          </div>
          <div className="admin-list">
            {latestJobs.map((job) => (
              <Link className="admin-list-row" href={`/admin/jobs/${job.id}/edit`} key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.company.name} · {job.city.name}</span>
                </div>
                <em>{jobStatusLabels[job.status]}</em>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Jalovec a reklamní pozice</h2>
              <p>Aktuální vydání a aktivní obchodní sloty.</p>
            </div>
            <Link className="admin-link" href="/admin/ads">Spravovat</Link>
          </div>
          <div className="admin-feature-box">
            <span>Aktuální číslo</span>
            <strong>{currentIssue?.title ?? "Není nastavené"}</strong>
            <small>{currentIssue ? dateCs(currentIssue.publishedAt) : "Doplňte v reklamách"}</small>
          </div>
          <div className="admin-list compact">
            {featuredAds.map((ad) => (
              <div className="admin-list-row" key={ad.id}>
                <div>
                  <strong>{ad.name}</strong>
                  <span>{ad.location} · {money(ad.priceCzk)} / {ad.durationDays} dní</span>
                </div>
                <em>{ad.status}</em>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Poslední reakce</h2>
            <p>Kontakty uchazečů, které je potřeba předat firmám.</p>
          </div>
          <Link className="admin-link" href="/admin/applications">Zpracovat</Link>
        </div>
        <div className="admin-list">
          {latestApplications.map((application) => (
            <Link className="admin-list-row" href={`/admin/applications?job=${application.jobId}`} key={application.id}>
              <div>
                <strong>{application.name}</strong>
                <span>{application.job.title} · {application.job.company.name} · {application.email}</span>
              </div>
              <em>{dateTimeCs(application.createdAt)}</em>
            </Link>
          ))}
          {latestApplications.length === 0 && <p className="admin-empty">Zatím nepřišly žádné reakce.</p>}
        </div>
      </section>

      <section className="admin-card warning-card">
        <div className="admin-card-head">
          <div>
            <h2>Úkoly redakce</h2>
            <p>Kontroly, které hlídají obchodní a provozní jistotu webu.</p>
          </div>
          <Link className="admin-link" href="/admin/tasks">Otevřít úkoly</Link>
        </div>
        <div className="warning-grid">
          <Link className="warning-item" href="/admin/jobs?status=ACTIVE">
            <AlertTriangle size={18} />
            <strong>{warnings.counts.expiringJobs}</strong>
            <span>Končí do 7 dní</span>
          </Link>
          <Link className="warning-item" href="/admin/finance">
            <AlertTriangle size={18} />
            <strong>{warnings.counts.activeWithoutInvoice}</strong>
            <span>Aktivní bez faktury</span>
          </Link>
          <Link className="warning-item" href="/admin/finance?status=PAID">
            <AlertTriangle size={18} />
            <strong>{warnings.counts.paidButInactive}</strong>
            <span>Zaplaceno, ale neaktivní</span>
          </Link>
          <Link className="warning-item" href="/admin/ads">
            <AlertTriangle size={18} />
            <strong>{warnings.counts.adsWithoutCreative}</strong>
            <span>Reklama bez kreativy</span>
          </Link>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Poslední změny v adminu</h2>
            <p>Rychlá historie zásahů do inzerátů, reakcí, reklam, Jalovce a financí.</p>
          </div>
        </div>
        <div className="admin-list compact">
          {latestActivities.map((activity) => (
            <div className="admin-list-row" key={activity.id}>
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
