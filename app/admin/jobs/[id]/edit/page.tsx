import { notFound } from "next/navigation";
import { renewJob } from "@/lib/actions/jobs";
import { AdminShell } from "@/components/AdminShell";
import { JobEditor } from "@/components/JobEditor";
import { requirePermission } from "@/lib/auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { dateCs, dateTimeCs, money } from "@/lib/format";
import { jobStatusLabels } from "@/lib/business-rules";

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
        city: true,
        category: true,
        package: true,
        suitabilities: true,
        invoices: { orderBy: { issuedAt: "desc" }, take: 6 },
        applications: { orderBy: { createdAt: "desc" }, take: 6 }
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
