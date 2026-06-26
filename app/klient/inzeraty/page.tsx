import Link from "next/link";
import { Eye, FilePenLine, Plus } from "lucide-react";
import { JobReviewStatus, JobStatus, type Prisma } from "@prisma/client";
import { ClientShell } from "@/components/ClientShell";
import { requireClient } from "@/lib/client-auth";
import { jobReviewStatusLabels, jobStatusLabels } from "@/lib/business-rules";
import { dateCs, money, salaryRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type ClientJobsParams = { view?: string; q?: string };

const tabs = [
  { key: "", label: "Vše" },
  { key: "active", label: "Aktivní" },
  { key: "submitted", label: "Ve schvalování" },
  { key: "changes", label: "Vrácené k úpravě" },
  { key: "draft", label: "Koncepty" },
  { key: "payment", label: "Čeká na platbu" },
  { key: "expired", label: "Uplynulé" }
];

function withParams(params: ClientJobsParams, patch: ClientJobsParams) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return `/klient/inzeraty${query ? `?${query}` : ""}`;
}

function isEditable(reviewStatus: JobReviewStatus) {
  return reviewStatus === JobReviewStatus.DRAFT || reviewStatus === JobReviewStatus.CHANGES_REQUESTED || reviewStatus === JobReviewStatus.REJECTED;
}

export default async function ClientJobsPage({ searchParams }: { searchParams: Promise<ClientJobsParams> }) {
  const client = await requireClient();
  const params = await searchParams;
  const where: Prisma.JobPostWhereInput = { companyId: client.companyId };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { shortIntro: { contains: params.q, mode: "insensitive" } }
    ];
  }
  if (params.view === "active") where.status = JobStatus.ACTIVE;
  if (params.view === "submitted") where.reviewStatus = { in: [JobReviewStatus.SUBMITTED, JobReviewStatus.IN_REVIEW] };
  if (params.view === "changes") where.reviewStatus = JobReviewStatus.CHANGES_REQUESTED;
  if (params.view === "draft") where.reviewStatus = JobReviewStatus.DRAFT;
  if (params.view === "payment") where.status = JobStatus.PENDING_PAYMENT;
  if (params.view === "expired") where.status = JobStatus.EXPIRED;

  const [jobs, activeCount, paymentCount, expiredCount] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      include: {
        package: true,
        invoices: { orderBy: { issuedAt: "desc" }, take: 1 },
        _count: { select: { applications: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100
    }),
    prisma.jobPost.count({ where: { companyId: client.companyId, status: JobStatus.ACTIVE } }),
    prisma.jobPost.count({ where: { companyId: client.companyId, status: JobStatus.PENDING_PAYMENT } }),
    prisma.jobPost.count({ where: { companyId: client.companyId, status: JobStatus.EXPIRED } })
  ]);

  return (
    <ClientShell>
      <div className="client-page-head">
        <div>
          <span className="admin-kicker">Inzeráty</span>
          <h1>Správa pracovních nabídek</h1>
          <p>Přehled všech inzerátů firmy, jejich schvalování, fakturace a výkonu.</p>
        </div>
        <Link className="button" href="/klient/inzeraty/novy"><Plus size={18} /> Nový inzerát</Link>
      </div>

      <section className="client-filter-panel">
        <nav className="jobs-status-tabs" aria-label="Filtr inzerátů">
          {tabs.map((tab) => (
            <Link className={(params.view ?? "") === tab.key ? "active" : ""} href={withParams(params, { view: tab.key })} key={tab.key || "all"}>
              <span>{tab.label}</span>
              {tab.key === "active" && <strong>{activeCount}</strong>}
              {tab.key === "payment" && <strong>{paymentCount}</strong>}
              {tab.key === "expired" && <strong>{expiredCount}</strong>}
            </Link>
          ))}
        </nav>
        <form className="admin-filter-bar">
          <input className="field" name="q" placeholder="Hledat podle názvu nebo textu" defaultValue={params.q ?? ""} />
          <input name="view" type="hidden" value={params.view ?? ""} />
          <button className="button" type="submit">Filtrovat</button>
          <Link className="button secondary" href="/klient/inzeraty">Vyčistit</Link>
        </form>
      </section>

      <section className="client-job-list">
        {jobs.map((job) => {
          const invoice = job.invoices[0];
          return (
            <article className="client-job-card" key={job.id}>
              <header>
                <div>
                  <span className={`status-pill status-${job.reviewStatus.toLowerCase()}`}>{jobReviewStatusLabels[job.reviewStatus]}</span>
                  <span className={`status-pill status-${job.status.toLowerCase()}`}>{jobStatusLabels[job.status]}</span>
                  <h2>{job.title}</h2>
                  <p>{job.shortIntro}</p>
                </div>
                <div className="jobs-action-strip">
                  <Link className="job-action-icon" href={`/klient/inzeraty/${job.id}`} title="Detail"><Eye size={18} /></Link>
                  {isEditable(job.reviewStatus) && <Link className="job-action-icon" href={`/klient/inzeraty/${job.id}/upravit`} title="Upravit"><FilePenLine size={18} /></Link>}
                  {job.status === JobStatus.ACTIVE && <Link className="job-action-icon" href={`/jobs/${job.slug}`} target="_blank" title="Veřejný detail"><Eye size={18} /></Link>}
                </div>
              </header>
              <div className="jobs-ops-sections">
                <section>
                  <span>Publikace</span>
                  <strong>{dateCs(job.activeFrom)} → {dateCs(job.activeUntil)}</strong>
                  <small>{job.status === JobStatus.ACTIVE ? "aktivní na webu" : jobStatusLabels[job.status]}</small>
                </section>
                <section>
                  <span>Balíček</span>
                  <strong>{job.package?.name ?? "Bez balíčku"}</strong>
                  <small>{invoice ? `${invoice.status} · ${money(invoice.amountCzk)}` : "faktura vznikne po schválení"}</small>
                </section>
                <section>
                  <span>Výkon</span>
                  <strong>{job.views} zobrazení · {job._count.applications} reakcí</strong>
                  <small>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</small>
                </section>
              </div>
            </article>
          );
        })}
        {jobs.length === 0 && (
          <div className="client-empty">
            <strong>Pro vybraný filtr tu nejsou žádné inzeráty.</strong>
            <Link className="button" href="/klient/inzeraty/novy"><Plus size={17} /> Zadat inzerát</Link>
          </div>
        )}
      </section>
    </ClientShell>
  );
}
