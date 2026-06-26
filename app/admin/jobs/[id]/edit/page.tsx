import { notFound } from "next/navigation";
import { JobReviewStatus, JobSource } from "@prisma/client";
import { renewJob } from "@/lib/actions/jobs";
import { approveClientJob, markJobInReview, rejectClientJob, requestJobChanges } from "@/lib/actions/job-review";
import { AdminShell } from "@/components/AdminShell";
import { JobEditor } from "@/components/JobEditor";
import { requirePermission } from "@/lib/auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { dateCs, dateTimeCs, money } from "@/lib/format";
import { jobReviewStatusLabels, jobStatusLabels } from "@/lib/business-rules";

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
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Úprava nabídky</span>
          <h1>Editovat inzerát</h1>
          <p>Kontrola obsahu, topování, médií a obchodních parametrů před dalším zveřejněním.</p>
        </div>
      </div>
      <section className="job-detail-admin-grid">
        <article className="admin-card">
          <span className={`status-pill status-${job.status.toLowerCase()}`}>{jobStatusLabels[job.status]}</span>
          <h2>Obsah</h2>
          <p>{job.shortIntro}</p>
          <div className="meta">
            <span>{job.company.name}</span>
            <span>{job.city.name}</span>
            <span>{job.category.name}</span>
          </div>
        </article>
        <article className="admin-card">
          <h2>Výkon</h2>
          <strong className="admin-big-number">{job.views}</strong>
          <p>Zobrazení detailu. Aktivní do {dateCs(job.activeUntil)}.</p>
        </article>
        <article className="admin-card">
          <h2>Reakce</h2>
          <strong className="admin-big-number">{job.applications.length}</strong>
          <p>Posledních {job.applications.length} reakcí v náhledu.</p>
          <div className="admin-list compact">
            {job.applications.slice(0, 3).map((application) => (
              <a className="admin-list-row" href={`/admin/applications/${application.id}`} key={application.id}>
                <div>
                  <strong>{application.name}</strong>
                  <span>{dateTimeCs(application.createdAt)}</span>
                </div>
              </a>
            ))}
          </div>
        </article>
        <article className="admin-card">
          <h2>Finance</h2>
          <p>{job.package ? `${job.package.name} · ${money(job.package.priceCzk)}` : "Bez balíčku"}</p>
          <div className="admin-list compact">
            {job.invoices.map((invoice) => (
              <div className="admin-list-row" key={invoice.id}>
                <div>
                  <strong>{invoice.number ?? "Faktura bez čísla"}</strong>
                  <span>{invoice.status}</span>
                </div>
                <em>{money(invoice.amountCzk)}</em>
              </div>
            ))}
            {job.invoices.length === 0 && <p className="admin-empty">Bez fakturace.</p>}
          </div>
        </article>
        <article className="admin-card">
          <h2>Historie</h2>
          <div className="admin-list compact">
            {activities.map((activity) => (
              <div className="admin-list-row" key={activity.id}>
                <div>
                  <strong>{activity.summary}</strong>
                  <span>{activity.actorEmail ?? "admin"} · {dateTimeCs(activity.createdAt)}</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="admin-empty">Zatím bez auditní historie.</p>}
          </div>
        </article>
      </section>
      {job.source === JobSource.CLIENT && (
        <section className="admin-card review-panel">
          <div className="admin-card-head">
            <div>
              <span className="admin-kicker">Klientské podání</span>
              <h2>Redakční schválení</h2>
              <p>
                {job.submittedByClient ? `${job.submittedByClient.name} · ${job.submittedByClient.email}` : job.company.name}
                {job.submittedAt ? ` · odesláno ${dateTimeCs(job.submittedAt)}` : ""}
              </p>
            </div>
            <span className={`status-pill status-${job.reviewStatus.toLowerCase()}`}>{jobReviewStatusLabels[job.reviewStatus]}</span>
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
      <section className="admin-card job-renew-panel">
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
      <JobEditor filters={filters} packages={packages} job={job} />
    </AdminShell>
  );
}
