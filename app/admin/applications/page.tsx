import Link from "next/link";
import { ApplicationStatus, type Prisma } from "@prisma/client";
import { Mail, MessageSquareText, Phone, Search, UserCheck, UsersRound } from "lucide-react";
import { updateApplication } from "@/lib/actions/applications";
import { AdminDataTable } from "@/components/AdminDataTable";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { AdminToolbar } from "@/components/AdminToolbar";
import { dateTimeCs } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applicationStatusLabels, applicationTagLabels } from "@/lib/business-rules";

function applicationStatusTone(status: ApplicationStatus) {
  if (status === ApplicationStatus.HIRED || status === ApplicationStatus.FORWARDED) return "success";
  if (status === ApplicationStatus.CONTACTED || status === ApplicationStatus.WAITING) return "info";
  if (status === ApplicationStatus.REJECTED) return "danger";
  return "warning";
}

export default async function AdminApplicationsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; job?: string }>;
}) {
  await requirePermission("applications:write");
  const params = await searchParams;
  const where: Prisma.ApplicationWhereInput = {};
  const q = params.q?.trim();

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { job: { title: { contains: q, mode: "insensitive" } } },
      { job: { company: { name: { contains: q, mode: "insensitive" } } } }
    ];
  }
  if (params.status && Object.values(ApplicationStatus).includes(params.status as ApplicationStatus)) {
    where.status = params.status as ApplicationStatus;
  }
  if (params.job) where.jobId = params.job;

  const [applications, allStatuses, jobs] = await Promise.all([
    prisma.application.findMany({
      where,
      select: {
        id: true,
        jobId: true,
        name: true,
        email: true,
        phone: true,
        message: true,
        status: true,
        tags: true,
        internalNote: true,
        createdAt: true,
        _count: { select: { communications: true } },
        job: { select: { title: true, company: { select: { name: true } }, city: { select: { name: true } } } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.application.findMany({ select: { status: true }, take: 5000 }),
    prisma.jobPost.findMany({
      include: { company: true },
      orderBy: { createdAt: "desc" },
      take: 250
    })
  ]);

  const countFor = (status: ApplicationStatus) => allStatuses.filter((item) => item.status === status).length;
  const exportParams = new URLSearchParams();
  if (q) exportParams.set("q", q);
  if (params.status) exportParams.set("status", params.status);
  if (params.job) exportParams.set("job", params.job);
  const exportHref = `/admin/applications/export${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <AdminShell>
      <AdminPageHeader
        actions={<Link className="button secondary" href={exportHref}>Export CSV</Link>}
        description="Kontakty, zprávy, štítky a stav předání firmám v jedné pracovní frontě."
        eyebrow="Uchazeči"
        title="Reakce"
      />

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><UsersRound size={22} /><span>Nové</span><strong>{countFor(ApplicationStatus.NEW)}</strong><small>čekají na první zpracování</small></article>
        <article className="admin-stat"><Mail size={22} /><span>Kontaktováno</span><strong>{countFor(ApplicationStatus.CONTACTED)}</strong><small>předané nebo řešené redakcí</small></article>
        <article className="admin-stat"><UserCheck size={22} /><span>Přijato</span><strong>{countFor(ApplicationStatus.HIRED)}</strong><small>úspěšně uzavřené reakce</small></article>
        <article className="admin-stat"><Search size={22} /><span>Výsledek filtru</span><strong>{applications.length}</strong><small>zobrazeno max. 100 reakcí</small></article>
      </section>

      <AdminToolbar className="admin-card applications-toolbar">
        <div className="admin-card-head">
          <div>
            <h2>Filtry reakcí</h2>
            <p>Najděte uchazeče podle jména, kontaktu, zprávy, firmy nebo pozice.</p>
          </div>
        </div>
        <form className="admin-filter-bar applications-filter">
          <input className="field" name="q" placeholder="Jméno, e-mail, firma nebo text" defaultValue={params.q ?? ""} />
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            {Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{applicationStatusLabels[status]}</option>)}
          </select>
          <select className="select" name="job" defaultValue={params.job ?? ""}>
            <option value="">Všechny inzeráty</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title} / {job.company.name}</option>)}
          </select>
          <button className="button" type="submit">Filtrovat</button>
          <Link className="button secondary" href="/admin/applications">Vyčistit</Link>
        </form>
      </AdminToolbar>

      <section className="admin-card applications-board">
        <div className="admin-card-head">
          <div>
            <h2>Pracovní fronta reakcí</h2>
            <p>Rychlý kontakt, stav, štítky a interní zpracování bez otevírání detailu.</p>
          </div>
          <span className="meta">{applications.length} položek</span>
        </div>
        <AdminDataTable>
          <table className="table admin-table applications-admin-table">
            <thead>
              <tr>
                <th>Uchazeč</th>
                <th>Inzerát</th>
                <th>Zpráva</th>
                <th>Stav</th>
                <th>Kontakt</th>
                <th>Zpracování</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td className="application-person-cell">
                    <strong>{application.name}</strong>
                    <span>{dateTimeCs(application.createdAt)}</span>
                    {application.tags.length > 0 && (
                      <div className="application-tags compact">
                        {application.tags.map((tag) => <span className="job-chip" key={tag}>{applicationTagLabels[tag]}</span>)}
                      </div>
                    )}
                  </td>
                  <td className="application-job-cell">
                    <Link href={`/admin/jobs/${application.jobId}/edit`}><strong>{application.job.title}</strong></Link>
                    <span>{application.job.company.name} · {application.job.city.name}</span>
                  </td>
                  <td className="application-message-cell">{application.message}</td>
                  <td><AdminStatusPill tone={applicationStatusTone(application.status)}>{applicationStatusLabels[application.status]}</AdminStatusPill></td>
                  <td>
                    <div className="admin-row-actions">
                      <a className="button ghost compact" href={`mailto:${application.email}?subject=Reakce na inzerát ${encodeURIComponent(application.job.title)}`}><Mail size={15} /> E-mail</a>
                      {application.phone && <a className="button ghost compact" href={`tel:${application.phone}`}><Phone size={15} /> Telefon</a>}
                      <Link className="button secondary compact" href={`/admin/applications/${application.id}`}><MessageSquareText size={15} /> Detail ({application._count.communications})</Link>
                    </div>
                  </td>
                  <td>
                    <form action={updateApplication} className="application-inline-workflow">
                      <input name="id" type="hidden" value={application.id} />
                      <input name="returnTo" type="hidden" value="/admin/applications" />
                      <select className="select" name="status" defaultValue={application.status}>
                        {Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{applicationStatusLabels[status]}</option>)}
                      </select>
                      <textarea className="textarea textarea-short" name="internalNote" placeholder="Interní poznámka" defaultValue={application.internalNote ?? ""} />
                      <input name="communicationChannel" type="hidden" value="note" />
                      <button className="button secondary compact" type="submit">Uložit</button>
                    </form>
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <AdminEmptyState text="Zkuste změnit filtr, případně počkejte na nové odpovědi z veřejného webu." title="Podle aktuálních filtrů tu není žádná reakce." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminDataTable>
      </section>
    </AdminShell>
  );
}
