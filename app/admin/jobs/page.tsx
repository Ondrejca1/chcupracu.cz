import Link from "next/link";
import { JobReviewStatus, JobSource, JobStatus, PaymentStatus, type Prisma } from "@prisma/client";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CreditCard,
  Eye,
  FilePenLine,
  Flame,
  Plus,
  Search,
  Send,
  ShieldOff,
  Sparkles
} from "lucide-react";
import { expireJob, renewJob } from "@/lib/actions/jobs";
import { AdminDataTable } from "@/components/AdminDataTable";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { AdminToolbar } from "@/components/AdminToolbar";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { dateCs, money, salaryRange } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeTopJobWhere, expiringJobWhere, jobReviewStatusLabels, jobStatusLabels, syncExpiredBusinessState } from "@/lib/business-rules";
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
  { key: "client-review", label: "Ke schválení", icon: Send },
  { key: "ACTIVE", label: "Aktivní", icon: Sparkles },
  { key: "expiring", label: "Končí", icon: CalendarDays },
  { key: "PENDING_PAYMENT", label: "Čeká platba", icon: CreditCard },
  { key: "DRAFT", label: "Koncepty", icon: FilePenLine },
  { key: "top", label: "Topované", icon: Flame },
  { key: "EXPIRED", label: "Expirované", icon: ShieldOff }
];

const paymentStatusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Nezaplaceno",
  PAID: "Zaplaceno",
  CANCELLED: "Storno"
};

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

function jobStatusTone(status: JobStatus) {
  if (status === JobStatus.ACTIVE) return "success";
  if (status === JobStatus.PENDING_PAYMENT || status === JobStatus.DRAFT) return "warning";
  if (status === JobStatus.EXPIRED || status === JobStatus.ARCHIVED) return "danger";
  return "neutral";
}

function reviewStatusTone(status: JobReviewStatus) {
  if (status === JobReviewStatus.APPROVED) return "success";
  if (status === JobReviewStatus.SUBMITTED || status === JobReviewStatus.IN_REVIEW) return "info";
  if (status === JobReviewStatus.CHANGES_REQUESTED || status === JobReviewStatus.DRAFT) return "warning";
  if (status === JobReviewStatus.REJECTED) return "danger";
  return "neutral";
}

function paymentStatusTone(status?: PaymentStatus) {
  if (status === PaymentStatus.PAID) return "success";
  if (status === PaymentStatus.UNPAID) return "warning";
  if (status === PaymentStatus.CANCELLED) return "danger";
  return "neutral";
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
  if (params.view === "client-review") {
    where.source = JobSource.CLIENT;
    where.reviewStatus = { in: [JobReviewStatus.SUBMITTED, JobReviewStatus.IN_REVIEW] };
  }
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

  const [jobs, applications, jobCounts, draftJobs, pendingJobs, expiredJobs, expiringJobs, topJobs, clientReviewJobs, cities, packages, totalMatches] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      include: {
        company: true,
        submittedByClient: true,
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
    prisma.jobPost.count({ where: { source: JobSource.CLIENT, reviewStatus: { in: [JobReviewStatus.SUBMITTED, JobReviewStatus.IN_REVIEW] } } }),
    prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } }),
    prisma.jobPost.count({ where })
  ]);

  const tabCounts: Record<string, number> = {
    "client-review": clientReviewJobs,
    ACTIVE: jobCounts.active,
    expiring: expiringJobs,
    PENDING_PAYMENT: pendingJobs,
    DRAFT: draftJobs,
    top: topJobs,
    EXPIRED: expiredJobs
  };

  return (
    <AdminShell>
      <AdminPageHeader
        actions={
          <Link className="button" href="/admin/jobs/new">
            <Plus size={18} /> Přidat inzerát
          </Link>
        }
        description="Kompaktní provozní přehled publikace, schvalování, plateb, výkonu a rychlých akcí."
        eyebrow="Pracovní nabídky"
        title="Inzeráty"
      />

      <section className="admin-stat-grid compact jobs-kpi-grid">
        <article className="admin-stat"><span>Aktivní</span><strong>{jobCounts.active}</strong><small>veřejně dostupné nabídky</small></article>
        <article className="admin-stat"><span>Na homepage</span><strong>{jobCounts.homepage}</strong><small>vybrané pro titulní stranu</small></article>
        <article className="admin-stat"><span>Čeká platba</span><strong>{pendingJobs}</strong><small>potřebuje obchodní kontrolu</small></article>
        <article className="admin-stat"><span>Ke schválení</span><strong>{clientReviewJobs}</strong><small>klientská podání</small></article>
        <article className="admin-stat"><span>Končí brzy</span><strong>{expiringJobs}</strong><small>do 7 dní</small></article>
        <article className="admin-stat"><span>Topované</span><strong>{topJobs}</strong><small>aktivní zvýraznění</small></article>
      </section>

      <AdminToolbar className="jobs-command-panel">
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
      </AdminToolbar>

      <section className="jobs-board jobs-table-board">
        <div className="jobs-board-head">
          <div>
            <span className="admin-kicker">Správa inzerátů</span>
            <h2>Operační tabulka</h2>
          </div>
          <span>{jobs.length} položek</span>
        </div>

        <AdminDataTable>
          <table className="table admin-table jobs-admin-table">
            <thead>
              <tr>
                <th>Nabídka</th>
                <th>Stavy</th>
                <th>Publikace</th>
                <th>Obchod</th>
                <th>Výkon</th>
                <th>Obnova</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const warnings = jobWarnings(job);
                const remaining = daysUntil(job.activeUntil);
                const invoice = job.invoices[0];
                return (
                  <tr key={job.id}>
                    <td className="jobs-title-cell">
                      <Link href={`/admin/jobs/${job.id}/edit`}>
                        <strong>{job.title}</strong>
                      </Link>
                      <span>{job.company.name} · {job.city.name}</span>
                      <small>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}{job.submittedByClient ? ` · zadal ${job.submittedByClient.email}` : ""}</small>
                      {warnings.length > 0 && (
                        <div className="jobs-warning-row compact">
                          {warnings.map((warning) => (
                            <span key={warning}><AlertTriangle size={12} /> {warning}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="admin-status-stack">
                        <AdminStatusPill tone={jobStatusTone(job.status)}>{jobStatusLabels[job.status]}</AdminStatusPill>
                        {job.source === JobSource.CLIENT && <AdminStatusPill tone={reviewStatusTone(job.reviewStatus)}>{jobReviewStatusLabels[job.reviewStatus]}</AdminStatusPill>}
                        {job.isTop && <AdminStatusPill icon={<Flame size={13} />} tone="success">TOP do {dateCs(job.topUntil)}</AdminStatusPill>}
                      </div>
                    </td>
                    <td>
                      <div className="jobs-table-meta">
                        <strong>{dateCs(job.activeFrom)} → {dateCs(job.activeUntil)}</strong>
                        <span>{remaining == null ? "bez konce" : remaining >= 0 ? `zbývá ${remaining} dní` : "po termínu"}</span>
                      </div>
                    </td>
                    <td>
                      <div className="jobs-table-meta">
                        <strong>{job.package?.name ?? "Bez balíčku"}</strong>
                        {invoice ? (
                          <span><AdminStatusPill tone={paymentStatusTone(invoice.status)}>{paymentStatusLabels[invoice.status]}</AdminStatusPill> {money(invoice.amountCzk)}</span>
                        ) : (
                          <span>bez faktury</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="jobs-table-meta">
                        <strong>{job.views} zobrazení</strong>
                        <span>{job._count.applications} reakcí · {job.showOnHomepage ? "homepage" : "mimo homepage"}</span>
                      </div>
                    </td>
                    <td>
                      <form action={renewJob} className="row-renew-form">
                        <input name="id" type="hidden" value={job.id} />
                        <select name="packageId" defaultValue={job.packageId ?? packages[0]?.id ?? ""}>
                          {packages.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · {item.durationDays} dní · {money(item.priceCzk)}
                            </option>
                          ))}
                        </select>
                        <button className="button secondary compact" type="submit">Použít</button>
                      </form>
                    </td>
                    <td>
                      <div className="jobs-action-strip compact" aria-label={`Akce pro ${job.title}`}>
                        <Link className="job-action-icon" href={`/admin/jobs/${job.id}/edit`} title="Editovat inzerát"><FilePenLine size={18} /></Link>
                        <Link className="job-action-icon" href={`/jobs/${job.slug}`} target="_blank" title="Otevřít veřejný náhled"><Eye size={18} /></Link>
                        <form action={expireJob}>
                          <input name="id" type="hidden" value={job.id} />
                          <ConfirmSubmitButton className="job-action-icon danger" message={`Opravdu skrýt inzerát „${job.title}“ z veřejného webu?`}>
                            <ShieldOff size={18} />
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState
                      action={<Link className="button secondary compact" href="/admin/jobs">Vyčistit filtry</Link>}
                      text="Zkuste upravit filtr nebo vytvořit nový pracovní inzerát."
                      title="Pro vybrané filtry tu nejsou žádné inzeráty."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminDataTable>
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
