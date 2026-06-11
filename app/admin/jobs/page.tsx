import Link from "next/link";
import { JobStatus, PaymentStatus, type Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Eye,
  FilePenLine,
  Flame,
  Gauge,
  PackageCheck,
  Plus,
  RotateCw,
  Search,
  ShieldOff,
  Sparkles
} from "lucide-react";
import { expireJob, renewJob } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { dateCs, money, salaryRange } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeTopJobWhere, expiringJobWhere, jobStatusLabels, syncExpiredBusinessState } from "@/lib/business-rules";
import { getJobVisibilityCounts } from "@/lib/queries";

type JobsSearchParams = {
  q?: string;
  status?: string;
  city?: string;
  top?: string;
  homepage?: string;
  view?: string;
  sort?: string;
};

const viewTabs = [
  { key: "", label: "Vše", icon: BriefcaseBusiness },
  { key: "ACTIVE", label: "Aktivní", icon: Sparkles },
  { key: "expiring", label: "Končí", icon: CalendarDays },
  { key: "PENDING_PAYMENT", label: "Čeká platba", icon: CreditCard },
  { key: "DRAFT", label: "Koncepty", icon: FilePenLine },
  { key: "top", label: "Topované", icon: Flame },
  { key: "EXPIRED", label: "Expirované", icon: ShieldOff }
];

function withParams(params: JobsSearchParams, patch: JobsSearchParams) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return `/admin/jobs${query ? `?${query}` : ""}`;
}

function daysUntil(date?: Date | null) {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function jobWarnings(job: {
  status: JobStatus;
  activeUntil: Date | null;
  contactEmail: string | null;
  packageId: string | null;
  isTop: boolean;
  topUntil: Date | null;
  invoices: { status: PaymentStatus }[];
}) {
  const warnings: string[] = [];
  const remaining = daysUntil(job.activeUntil);
  if (job.status === JobStatus.ACTIVE && remaining != null && remaining <= 7 && remaining >= 0) warnings.push(`Končí za ${remaining} dní`);
  if (job.status === JobStatus.ACTIVE && job.invoices.length === 0 && job.packageId) warnings.push("Aktivní bez faktury");
  if (job.invoices.some((invoice) => invoice.status === PaymentStatus.PAID) && job.status !== JobStatus.ACTIVE) warnings.push("Zaplaceno, ale není aktivní");
  if (job.isTop && job.topUntil && job.topUntil < new Date()) warnings.push("Topování skončilo");
  if (!job.contactEmail) warnings.push("Chybí kontaktní e-mail");
  return warnings;
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<JobsSearchParams> }) {
  await requirePermission("jobs:write");
  await syncExpiredBusinessState();
  const params = await searchParams;
  const now = new Date();
  const where: Prisma.JobPostWhereInput = {};
  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { shortIntro: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } }
    ];
  }
  if (params.view === "expiring") Object.assign(where, expiringJobWhere(now));
  if (params.view === "top") Object.assign(where, activeTopJobWhere(now));
  if (params.view && Object.values(JobStatus).includes(params.view as JobStatus)) where.status = params.view as JobStatus;
  if (params.status && Object.values(JobStatus).includes(params.status as JobStatus)) where.status = params.status as JobStatus;
  if (params.city) where.cityId = params.city;
  if (params.top === "yes") where.isTop = true;
  if (params.top === "no") where.isTop = false;
  if (params.homepage === "yes") where.showOnHomepage = true;
  if (params.homepage === "no") where.showOnHomepage = false;

  const orderBy: Prisma.JobPostOrderByWithRelationInput[] =
    params.sort === "ending"
      ? [{ activeUntil: "asc" }, { createdAt: "desc" }]
      : params.sort === "views"
        ? [{ views: "desc" }, { createdAt: "desc" }]
        : params.sort === "top"
          ? [{ isTop: "desc" }, { topUntil: "desc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

  const [jobs, applications, jobCounts, draftJobs, pendingJobs, expiredJobs, expiringJobs, topJobs, cities, packages, totalMatches] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      include: {
        company: true,
        city: true,
        package: true,
        invoices: { orderBy: { issuedAt: "desc" }, take: 3, select: { id: true, status: true, amountCzk: true } },
        _count: { select: { applications: true } }
      },
      orderBy,
      take: 100
    }),
    prisma.application.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        job: { select: { title: true, company: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    getJobVisibilityCounts(),
    prisma.jobPost.count({ where: { status: JobStatus.DRAFT } }),
    prisma.jobPost.count({ where: { status: JobStatus.PENDING_PAYMENT } }),
    prisma.jobPost.count({ where: { status: JobStatus.EXPIRED } }),
    prisma.jobPost.count({ where: expiringJobWhere(now) }),
    prisma.jobPost.count({ where: activeTopJobWhere(now) }),
    prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } }),
    prisma.jobPost.count({ where })
  ]);

  const tabCounts: Record<string, number> = {
    ACTIVE: jobCounts.active,
    expiring: expiringJobs,
    PENDING_PAYMENT: pendingJobs,
    DRAFT: draftJobs,
    top: topJobs,
    EXPIRED: expiredJobs
  };

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Pracovní nabídky</span>
          <h1>Inzeráty</h1>
          <p>Operační přehled publikace, balíčků, topování, výkonu a rychlých akcí pro redakci.</p>
        </div>
        <Link className="button" href="/admin/jobs/new">
          <Plus size={18} /> Přidat inzerát
        </Link>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><span>Aktivní</span><strong>{jobCounts.active}</strong><small>veřejně dostupné nabídky</small></article>
        <article className="admin-stat"><span>Na homepage</span><strong>{jobCounts.homepage}</strong><small>vybrané pro titulní stranu</small></article>
        <article className="admin-stat"><span>Čeká platba</span><strong>{pendingJobs}</strong><small>potřebuje obchodní kontrolu</small></article>
        <article className="admin-stat"><span>Končí brzy</span><strong>{expiringJobs}</strong><small>do 7 dní</small></article>
        <article className="admin-stat"><span>Topované</span><strong>{topJobs}</strong><small>aktivní zvýraznění</small></article>
      </section>

      <section className="jobs-command-panel">
        <nav className="jobs-status-tabs" aria-label="Stavy inzerátů">
          {viewTabs.map((tab) => {
            const Icon = tab.icon;
            const active = (params.view ?? "") === tab.key;
            return (
              <Link className={active ? "active" : ""} href={withParams(params, { view: tab.key, status: "" })} key={tab.key || "all"}>
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.key && <strong>{tabCounts[tab.key] ?? totalMatches}</strong>}
              </Link>
            );
          })}
        </nav>

        <form className="jobs-filter-grid">
          <label>
            <Search size={16} />
            <input name="q" placeholder="Název, firma nebo text" defaultValue={params.q ?? ""} />
          </label>
          <select name="city" defaultValue={params.city ?? ""}>
            <option value="">Všechna města</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">Stav podle záložky</option>
            {Object.values(JobStatus).map((status) => <option key={status} value={status}>{jobStatusLabels[status]}</option>)}
          </select>
          <select name="top" defaultValue={params.top ?? ""}>
            <option value="">Topování nerozhoduje</option>
            <option value="yes">Jen topované</option>
            <option value="no">Bez topování</option>
          </select>
          <select name="homepage" defaultValue={params.homepage ?? ""}>
            <option value="">Homepage nerozhoduje</option>
            <option value="yes">Na homepage</option>
            <option value="no">Mimo homepage</option>
          </select>
          <select name="sort" defaultValue={params.sort ?? "newest"}>
            <option value="newest">Nejnovější</option>
            <option value="ending">Končí nejdřív</option>
            <option value="views">Nejvíc zobrazení</option>
            <option value="top">Topované nahoře</option>
          </select>
          <input name="view" type="hidden" value={params.view ?? ""} />
          <button className="button" type="submit">Filtrovat</button>
          <Link className="button secondary" href="/admin/jobs">Vyčistit</Link>
        </form>
        <p className="jobs-result-note">Zobrazeno {jobs.length} z {totalMatches} nalezených inzerátů. Přehled je omezený na prvních 100 položek.</p>
      </section>

      <section className="jobs-board">
        <div className="jobs-board-head">
          <div>
            <span className="admin-kicker">Správa inzerátů</span>
            <h2>Publikace, balíčky a výkon</h2>
          </div>
          <span>{jobs.length} položek</span>
        </div>

        <div className="jobs-ops-list">
          {jobs.map((job) => {
            const warnings = jobWarnings(job);
            const remaining = daysUntil(job.activeUntil);
            const invoice = job.invoices[0];
            return (
              <article className="jobs-ops-card" key={job.id}>
                <header className="jobs-ops-title">
                  <div>
                    <span className={`status-pill status-${job.status.toLowerCase()}`}>{jobStatusLabels[job.status]}</span>
                    {job.isTop && <span className="status-pill status-active"><Flame size={13} /> TOP do {dateCs(job.topUntil)}</span>}
                    {warnings.length > 0 && <span className="status-pill status-waiting"><AlertTriangle size={13} /> {warnings[0]}</span>}
                    <h3>{job.title}</h3>
                    <p>{job.company.name} · {job.city.name} · {salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</p>
                  </div>
                  <div className="jobs-action-strip" aria-label={`Akce pro ${job.title}`}>
                    <Link className="job-action-icon" href={`/admin/jobs/${job.id}/edit`} title="Editovat inzerát"><FilePenLine size={18} /></Link>
                    <Link className="job-action-icon" href={`/jobs/${job.slug}`} target="_blank" title="Otevřít veřejný náhled"><Eye size={18} /></Link>
                    <form action={expireJob}>
                      <input name="id" type="hidden" value={job.id} />
                      <ConfirmSubmitButton className="job-action-icon danger" message={`Opravdu skrýt inzerát „${job.title}“ z veřejného webu?`}>
                        <ShieldOff size={18} />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </header>

                <div className="jobs-ops-sections">
                  <section>
                    <span><CalendarDays size={15} /> Publikace</span>
                    <strong>{dateCs(job.activeFrom)} → {dateCs(job.activeUntil)}</strong>
                    <small>{remaining == null ? "Bez konce" : remaining >= 0 ? `zbývá ${remaining} dní` : "po termínu"}</small>
                  </section>
                  <section>
                    <span><PackageCheck size={15} /> Obchod</span>
                    <strong>{job.package?.name ?? "Bez balíčku"}</strong>
                    <small>{invoice ? `${invoice.status} · ${money(invoice.amountCzk)}` : "bez faktury"}</small>
                  </section>
                  <section>
                    <span><Gauge size={15} /> Výkon</span>
                    <strong>{job.views} zobrazení · {job._count.applications} reakcí</strong>
                    <small>{job.showOnHomepage ? "na homepage" : "mimo homepage"}</small>
                  </section>
                  <section>
                    <span><BriefcaseBusiness size={15} /> Obsah</span>
                    <strong>{job.shortIntro}</strong>
                    <small>{job.contactEmail ?? "chybí kontaktní e-mail"}</small>
                  </section>
                </div>

                {warnings.length > 1 && (
                  <div className="jobs-warning-row">
                    {warnings.slice(1).map((warning) => <span key={warning}>{warning}</span>)}
                  </div>
                )}

                <form action={renewJob} className="jobs-renew-bar">
                  <input name="id" type="hidden" value={job.id} />
                  <div className="jobs-renew-icon">
                    <RotateCw size={18} />
                  </div>
                  <label>
                    <span>Prodloužení podle balíčku</span>
                    <select name="packageId" defaultValue={job.packageId ?? packages[0]?.id ?? ""}>
                      {packages.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.durationDays} dní · {money(item.priceCzk)}{item.isTopPlacement ? ` · TOP ${item.topDays ?? 0} dní` : ""}
                        </option>
                      ))}
                    </select>
                    <small>Délka, cena a případné TOP zvýraznění se převezmou z vybraného balíčku.</small>
                  </label>
                  <button className="renew-package-button" type="submit">
                    Použít balíček
                  </button>
                </form>
              </article>
            );
          })}
          {jobs.length === 0 && <p className="admin-empty">Pro vybrané filtry tu nejsou žádné inzeráty.</p>}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Poslední reakce</h2>
            <p>Rychlý přehled nejnovějších odpovědí na pracovní nabídky.</p>
          </div>
          <Link className="admin-link" href="/admin/applications">Všechny <ArrowUpRight size={16} /></Link>
        </div>
        {applications.map((application) => (
          <div className="admin-response-card" key={application.id}>
            <strong>{application.name}</strong> odpověděl/a na {application.job.title}
            <p>{application.message}</p>
            <div className="meta">{application.email} · {application.phone ?? "bez telefonu"} · {application.job.company.name}</div>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
