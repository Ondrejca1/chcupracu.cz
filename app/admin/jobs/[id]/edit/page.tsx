import Link from "next/link";
import { notFound } from "next/navigation";
import { JobReviewStatus, JobSource, JobStatus } from "@prisma/client";
import { ArrowLeft, Eye } from "lucide-react";
import { renewJob } from "@/lib/actions/jobs";
import { approveClientJob, markJobInReview, rejectClientJob, requestJobChanges } from "@/lib/actions/job-review";
import { AdminDataTable } from "@/components/AdminDataTable";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { JobEditor } from "@/components/JobEditor";
import { requirePermission } from "@/lib/auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { dateCs, dateTimeCs, money } from "@/lib/format";
import { applicationStatusLabels, jobReviewStatusLabels, jobStatusLabels } from "@/lib/business-rules";

const invoiceStatusLabels = {
  UNPAID: "Nezaplaceno",
  PAID: "Zaplaceno",
  CANCELLED: "Storno"
} as const;

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

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("jobs:write");
  const { id } = await params;
  const [filters, packages, job, activities] = await Promise.all([
    getFilters(),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } }),
    prisma.jobPost.findUnique({
      where: { id },
      include: {
        company: true,
        submittedByClient: true,
        reviewedByAdmin: true,
        city: true,
        category: true,
        package: true,
        suitabilities: true,
        invoices: { orderBy: { issuedAt: "desc" }, take: 6 },
        applications: { orderBy: { createdAt: "desc" }, take: 6 },
        reviewComments: { orderBy: { createdAt: "desc" }, take: 8 }
      }
    }),
    prisma.activityLog.findMany({ where: { entityType: "jobPost", entityId: id }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  if (!job) notFound();

  return (
    <AdminShell>
      <AdminPageHeader
        actions={
          <>
            <Link className="button secondary" href="/admin/jobs"><ArrowLeft size={17} /> Zpět na inzeráty</Link>
            <Link className="button ghost" href={`/jobs/${job.slug}`} target="_blank"><Eye size={17} /> Veřejný náhled</Link>
          </>
        }
        description={`${job.company.name} · ${job.city.name} · ${job.category.name}`}
        eyebrow="Úprava nabídky"
        title={job.title}
      />

      <nav className="admin-record-tabs" aria-label="Sekce detailu inzerátu">
        <a href="#job-basic">Obsah</a>
        <a href="#job-publishing">Publikace</a>
        <a href="#job-finance">Finance</a>
        <a href="#job-reactions">Reakce</a>
        {job.source === JobSource.CLIENT && <a href="#job-review">Schvalování</a>}
        <a href="#job-history">Historie</a>
      </nav>

      <section className="job-command-center">
        <article className="admin-card job-command-primary">
          <div className="admin-status-stack">
            <AdminStatusPill tone={jobStatusTone(job.status)}>{jobStatusLabels[job.status]}</AdminStatusPill>
            {job.source === JobSource.CLIENT && <AdminStatusPill tone={reviewStatusTone(job.reviewStatus)}>{jobReviewStatusLabels[job.reviewStatus]}</AdminStatusPill>}
          </div>
          <h2>{job.title}</h2>
          <p>{job.shortIntro}</p>
          <div className="meta">
            <span>{job.company.name}</span>
            <span>{job.city.name}</span>
            <span>{job.category.name}</span>
          </div>
        </article>
        <article className="admin-card job-command-tile">
          <h2>Výkon</h2>
          <strong className="admin-big-number">{job.views}</strong>
          <p>Zobrazení detailu</p>
        </article>
        <article className="admin-card job-command-tile">
          <h2>Aktivní do</h2>
          <strong>{dateCs(job.activeUntil)}</strong>
          <p>{job.isTop && job.topUntil ? `TOP do ${dateCs(job.topUntil)}` : "Bez aktivního topování"}</p>
        </article>
        <article className="admin-card job-command-tile">
          <h2>Reakce</h2>
          <strong className="admin-big-number">{job.applications.length}</strong>
          <p>Posledních odpovědí v náhledu</p>
        </article>
        <article className="admin-card job-command-tile">
          <h2>Finance</h2>
          <strong>{job.package ? money(job.package.priceCzk) : "-"}</strong>
          <p>{job.package?.name ?? "Bez balíčku"}</p>
        </article>
      </section>

      <JobEditor filters={filters} packages={packages} job={job} />

      <section className="admin-card job-renew-panel" id="job-renew">
        <div>
          <span className="admin-kicker">Obnovení inzerátu</span>
          <h2>Rychlé prodloužení</h2>
          <p>Jedním klikem nastavíte stav aktivní, nové datum „Aktivní od“, „Aktivní do“ a případné topování.</p>
        </div>
        <div className="job-renew-actions">
          {[
            { label: "14 dní", days: 14, topDays: 0 },
            { label: "30 dní", days: 30, topDays: 0 },
            { label: "45 dní + TOP", days: 45, topDays: 14 }
          ].map((item) => (
            <form action={renewJob} key={item.label}>
              <input name="id" type="hidden" value={job.id} />
              <input name="days" type="hidden" value={item.days} />
              <input name="topDays" type="hidden" value={item.topDays} />
              <input name="highlightColor" type="hidden" value={job.highlightColor ?? ""} />
              <button className="renew-choice-button" type="submit">
                <strong>{item.label}</strong>
                <span>{item.topDays ? `Topovat ${item.topDays} dní` : "Bez topování"}</span>
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="admin-card job-ops-panel" id="job-finance">
        <div className="admin-card-head">
          <div>
            <span className="admin-kicker">Finance</span>
            <h2>Fakturace a balíček</h2>
            <p>{job.package ? `${job.package.name} · ${money(job.package.priceCzk)}` : "Inzerát zatím nemá přiřazený placený balíček."}</p>
          </div>
          <Link className="button secondary compact" href={`/admin/finance?company=${encodeURIComponent(job.company.name)}`}>Otevřít finance</Link>
        </div>
        <AdminDataTable>
          <table className="table admin-table job-admin-table">
            <thead>
              <tr><th>Faktura</th><th>Stav</th><th>Částka</th><th>Vystaveno</th></tr>
            </thead>
            <tbody>
              {job.invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.number ?? "Faktura bez čísla"}</strong></td>
                  <td><AdminStatusPill tone={invoice.status === "PAID" ? "success" : invoice.status === "UNPAID" ? "warning" : "danger"}>{invoiceStatusLabels[invoice.status]}</AdminStatusPill></td>
                  <td><strong>{money(invoice.amountCzk)}</strong></td>
                  <td>{dateCs(invoice.issuedAt)}</td>
                </tr>
              ))}
              {job.invoices.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <AdminEmptyState text="Faktura se doplní podle balíčku, případně ji najdete v samostatné sekci finance." title="K tomuto inzerátu zatím není žádná faktura." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminDataTable>
      </section>

      <section className="admin-card job-ops-panel" id="job-reactions">
        <div className="admin-card-head">
          <div>
            <span className="admin-kicker">Reakce</span>
            <h2>Odpovědi uchazečů</h2>
            <p>Posledních {job.applications.length} odpovědí navázaných na tento inzerát.</p>
          </div>
          <Link className="button secondary compact" href={`/admin/applications?job=${job.id}`}>Všechny reakce</Link>
        </div>
        <AdminDataTable>
          <table className="table admin-table job-admin-table">
            <thead>
              <tr><th>Uchazeč</th><th>Kontakt</th><th>Stav</th><th>Přijato</th><th>Akce</th></tr>
            </thead>
            <tbody>
              {job.applications.map((application) => (
                <tr key={application.id}>
                  <td><strong>{application.name}</strong></td>
                  <td>{application.email}</td>
                  <td>{applicationStatusLabels[application.status]}</td>
                  <td>{dateTimeCs(application.createdAt)}</td>
                  <td><Link className="button ghost compact" href={`/admin/applications/${application.id}`}>Detail</Link></td>
                </tr>
              ))}
              {job.applications.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <AdminEmptyState text="Jakmile uchazeč odešle formulář z veřejného webu, zobrazí se tady i v sekci Reakce." title="Zatím bez reakcí." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminDataTable>
      </section>

      {job.source === JobSource.CLIENT && (
        <section className="admin-card review-panel" id="job-review">
          <div className="admin-card-head">
            <div>
              <span className="admin-kicker">Klientské podání</span>
              <h2>Redakční schválení</h2>
              <p>
                {job.submittedByClient ? `${job.submittedByClient.name} · ${job.submittedByClient.email}` : job.company.name}
                {job.submittedAt ? ` · odesláno ${dateTimeCs(job.submittedAt)}` : ""}
              </p>
            </div>
            <AdminStatusPill tone={reviewStatusTone(job.reviewStatus)}>{jobReviewStatusLabels[job.reviewStatus]}</AdminStatusPill>
          </div>
          {job.reviewNote && <p className="client-alert"><strong>Poslední poznámka:</strong> {job.reviewNote}</p>}
          <div className="review-actions-grid">
            {(job.reviewStatus === JobReviewStatus.SUBMITTED || job.reviewStatus === JobReviewStatus.CHANGES_REQUESTED) && (
              <form action={markJobInReview}>
                <input name="id" type="hidden" value={job.id} />
                <button className="button secondary" type="submit">Převzít do kontroly</button>
              </form>
            )}
            <form action={approveClientJob} className="review-action-card">
              <input name="id" type="hidden" value={job.id} />
              <input name="mode" type="hidden" value="payment" />
              <textarea className="textarea textarea-short" name="note" placeholder="Interní/klientská poznámka ke schválení" />
              <button className="button" type="submit">Schválit a čekat na platbu</button>
            </form>
            <form action={approveClientJob} className="review-action-card">
              <input name="id" type="hidden" value={job.id} />
              <input name="mode" type="hidden" value="publish" />
              <textarea className="textarea textarea-short" name="note" placeholder="Poznámka k okamžité publikaci" />
              <button className="button secondary" type="submit">Schválit a publikovat</button>
            </form>
            <form action={requestJobChanges} className="review-action-card">
              <input name="id" type="hidden" value={job.id} />
              <textarea className="textarea textarea-short" name="note" placeholder="Co má klient upravit" required />
              <button className="button secondary" type="submit">Vrátit k úpravě</button>
            </form>
            <form action={rejectClientJob} className="review-action-card">
              <input name="id" type="hidden" value={job.id} />
              <textarea className="textarea textarea-short" name="note" placeholder="Důvod zamítnutí" />
              <button className="button danger" type="submit">Zamítnout</button>
            </form>
          </div>
          <div className="admin-list compact">
            {job.reviewComments.map((comment) => (
              <div className="admin-list-row" key={comment.id}>
                <div>
                  <strong>{comment.message}</strong>
                  <span>{comment.authorEmail ?? comment.authorType} · {dateTimeCs(comment.createdAt)}</span>
                </div>
              </div>
            ))}
            {job.reviewComments.length === 0 && <p className="admin-empty">Zatím bez komentářů ke schválení.</p>}
          </div>
        </section>
      )}

      <section className="admin-card job-ops-panel" id="job-history">
        <div className="admin-card-head">
          <div>
            <span className="admin-kicker">Historie</span>
            <h2>Auditní stopa</h2>
            <p>Poslední systémové události k tomuto inzerátu.</p>
          </div>
        </div>
        <div className="admin-list compact job-history-list">
          {activities.map((activity) => (
            <div className="admin-list-row" key={activity.id}>
              <div>
                <strong>{activity.summary}</strong>
                <span>{activity.actorEmail ?? "admin"} · {dateTimeCs(activity.createdAt)}</span>
              </div>
            </div>
          ))}
          {activities.length === 0 && <AdminEmptyState text="Až se inzerát schválí, upraví nebo obnoví, události se propíšou sem." title="Zatím bez auditní historie." />}
        </div>
      </section>
    </AdminShell>
  );
}
