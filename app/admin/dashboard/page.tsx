import Link from "next/link";
import { addDays } from "date-fns";
import { AdPlacementStatus, ApplicationStatus, JobStatus, PaymentStatus } from "@prisma/client";
import { ArrowUpRight, BarChart3, BriefcaseBusiness, CalendarClock, CircleDollarSign, FilePlus2, Megaphone, Newspaper, Plus, UsersRound } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentIssue, getFeaturedAds } from "@/lib/queries";

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
    href: "/admin/ads#jalovec",
    icon: Newspaper
  },
  {
    title: "Reklamní plocha",
    text: "Zadat partnera, cenu, délku kampaně, dostupné sloty a stav kampaně.",
    href: "/admin/ads#reklamy",
    icon: Megaphone
  },
  {
    title: "Číselníky a finance",
    text: "Správa měst, balíčků, faktur a základních ekonomických filtrů.",
    href: "/admin/settings",
    icon: CircleDollarSign
  }
];

export default async function AdminDashboardPage() {
  await requireAdmin();
  const now = new Date();
  const soon = addDays(now, 7);

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
    activeAds
  ] = await Promise.all([
    prisma.jobPost.count({ where: { status: JobStatus.ACTIVE } }),
    prisma.jobPost.count({ where: { status: JobStatus.DRAFT } }),
    prisma.jobPost.count({ where: { status: JobStatus.ACTIVE, activeUntil: { lte: soon } } }),
    prisma.application.count({ where: { status: ApplicationStatus.NEW } }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.UNPAID }, _sum: { amountCzk: true }, _count: true }),
    getCurrentIssue(),
    prisma.application.findMany({
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.jobPost.findMany({
      include: { company: true, city: true },
      orderBy: { createdAt: "desc" },
      take: 6
    }),
    getFeaturedAds(4),
    prisma.adPlacement.count({ where: { status: AdPlacementStatus.ACTIVE } }).catch(() => 0)
  ]);

  const stats = [
    { label: "Aktivní inzeráty", value: activeJobs, hint: `${draftJobs} konceptů`, icon: BriefcaseBusiness },
    { label: "Končí do 7 dní", value: expiringJobs, hint: "vhodné obnovit nebo topovat", icon: CalendarClock },
    { label: "Nové reakce", value: newApplications, hint: "čekají na zpracování", icon: UsersRound },
    { label: "Nezaplacené faktury", value: money(unpaidInvoices._sum.amountCzk), hint: `${unpaidInvoices._count} položek`, icon: BarChart3 },
    { label: "Aktivní reklamy", value: activeAds, hint: "běžící reklamní pozice", icon: Megaphone }
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
              <small>
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
                <em>{job.status}</em>
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Jalovec a reklamy</h2>
              <p>Aktuální vydání a top reklamní pozice.</p>
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
        </div>
        <div className="admin-list">
          {latestApplications.map((application) => (
            <div className="admin-list-row" key={application.id}>
              <div>
                <strong>{application.name}</strong>
                <span>{application.job.title} · {application.job.company.name} · {application.email}</span>
              </div>
              <em>{dateCs(application.createdAt)}</em>
            </div>
          ))}
          {latestApplications.length === 0 && <p className="admin-empty">Zatím nepřišly žádné reakce.</p>}
        </div>
      </section>
    </AdminShell>
  );
}
