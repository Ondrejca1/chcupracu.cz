import Link from "next/link";
import { ApplicationStatus, type Prisma } from "@prisma/client";
import { Mail, Phone, Search, UserCheck, UsersRound } from "lucide-react";
import { updateApplication } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { dateTimeCs } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  NEW: "Nová",
  CONTACTED: "Kontaktováno",
  REJECTED: "Nevybráno",
  HIRED: "Přijato"
};

export default async function AdminApplicationsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string; job?: string }>;
}) {
  await requireAdmin();
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
      include: { job: { include: { company: true, city: true } } },
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
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Uchazeči</span>
          <h1>Reakce</h1>
          <p>Kontakty, zprávy a stav předání firmám na jednom místě.</p>
        </div>
        <Link className="button secondary" href={exportHref}>
          Export CSV
        </Link>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><UsersRound size={22} /><span>Nové</span><strong>{countFor(ApplicationStatus.NEW)}</strong><small>čekají na první zpracování</small></article>
        <article className="admin-stat"><Mail size={22} /><span>Kontaktováno</span><strong>{countFor(ApplicationStatus.CONTACTED)}</strong><small>předané nebo řešené redakcí</small></article>
        <article className="admin-stat"><UserCheck size={22} /><span>Přijato</span><strong>{countFor(ApplicationStatus.HIRED)}</strong><small>úspěšně uzavřené reakce</small></article>
        <article className="admin-stat"><Search size={22} /><span>Výsledek filtru</span><strong>{applications.length}</strong><small>zobrazeno max. 100 reakcí</small></article>
      </section>

      <section className="admin-card">
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
      </section>

      <section className="application-list">
        {applications.map((application) => (
          <article className="application-card" key={application.id}>
            <div className="application-main">
              <div className="application-head">
                <span className={`status-pill status-${application.status.toLowerCase()}`}>{applicationStatusLabels[application.status]}</span>
                <strong>{application.name}</strong>
                <small>{dateTimeCs(application.createdAt)}</small>
              </div>
              <h2>{application.job.title}</h2>
              <p>{application.message}</p>
              <div className="meta">
                <span>{application.job.company.name}</span>
                <span>{application.job.city.name}</span>
                <span>{application.email}</span>
                <span>{application.phone ?? "bez telefonu"}</span>
              </div>
              <div className="admin-button-row">
                <a className="admin-icon-link" href={`mailto:${application.email}?subject=Reakce na inzerát ${encodeURIComponent(application.job.title)}`}>
                  <Mail size={16} /> Napsat e-mail
                </a>
                {application.phone && (
                  <a className="admin-icon-link" href={`tel:${application.phone}`}>
                    <Phone size={16} /> Zavolat
                  </a>
                )}
                <Link className="admin-icon-link" href={`/admin/jobs/${application.jobId}/edit`}>
                  Inzerát
                </Link>
              </div>
            </div>
            <form action={updateApplication} className="application-workflow">
              <input name="id" type="hidden" value={application.id} />
              <label className="field-group">
                <span>Stav</span>
                <select className="select" name="status" defaultValue={application.status}>
                  {Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{applicationStatusLabels[status]}</option>)}
                </select>
              </label>
              <label className="field-group">
                <span>Interní poznámka</span>
                <textarea className="textarea textarea-short" name="internalNote" placeholder="Co už redakce vyřešila, komu se reakce předala..." defaultValue={application.internalNote ?? ""} />
              </label>
              <button className="button secondary" type="submit">Uložit zpracování</button>
            </form>
          </article>
        ))}
        {applications.length === 0 && (
          <section className="admin-card">
            <p className="admin-empty">Podle aktuálních filtrů tu není žádná reakce.</p>
          </section>
        )}
      </section>
    </AdminShell>
  );
}
