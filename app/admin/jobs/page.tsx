import Link from "next/link";
import { JobStatus } from "@prisma/client";
import { addDays } from "date-fns";
import { ArrowUpRight, Eye, Flame, Pencil, Plus, RotateCw } from "lucide-react";
import { expireJob, renewJob } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, salaryRange } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminJobsPage() {
  await requireAdmin();
  const soon = addDays(new Date(), 7);
  const [jobs, applications, activeJobs, draftJobs, expiringJobs, topJobs] = await Promise.all([
    prisma.jobPost.findMany({
      include: { company: true, city: true, applications: true, package: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.application.findMany({
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    }),
    prisma.jobPost.count({ where: { status: JobStatus.ACTIVE } }),
    prisma.jobPost.count({ where: { status: JobStatus.DRAFT } }),
    prisma.jobPost.count({ where: { status: JobStatus.ACTIVE, activeUntil: { lte: soon } } }),
    prisma.jobPost.count({ where: { isTop: true, status: JobStatus.ACTIVE } })
  ]);

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Pracovní nabídky</span>
          <h1>Inzeráty</h1>
          <p>Obnova, topování, skrytí, editace a kontrola výkonu jednotlivých nabídek.</p>
        </div>
        <Link className="button" href="/admin/jobs/new">
          <Plus size={18} /> Přidat inzerát
        </Link>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><span>Aktivní</span><strong>{activeJobs}</strong><small>veřejně dostupné nabídky</small></article>
        <article className="admin-stat"><span>Koncepty</span><strong>{draftJobs}</strong><small>čekají na doplnění</small></article>
        <article className="admin-stat"><span>Končí brzy</span><strong>{expiringJobs}</strong><small>do 7 dní</small></article>
        <article className="admin-stat"><span>Topované</span><strong>{topJobs}</strong><small>zvýrazněné nabídky</small></article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Správa inzerátů</h2>
            <p>Každý řádek má rychlou obnovu, topování a přímý náhled.</p>
          </div>
        </div>
        <div className="job-admin-list">
          {jobs.map((job) => (
            <article className="job-admin-item" key={job.id}>
              <div className="job-admin-main">
                <span className={`status-pill status-${job.status.toLowerCase()}`}>{job.status}</span>
                {job.isTop && <span className="status-pill status-active"><Flame size={13} /> Topováno</span>}
                <h3>{job.title}</h3>
                <p>{job.shortIntro}</p>
                <div className="meta">
                  <strong>{job.company.name}</strong>
                  <span>{job.city.name}</span>
                  <span>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</span>
                  <span>{job.applications.length} reakcí</span>
                  <span>Aktivní do {dateCs(job.activeUntil)}</span>
                </div>
              </div>
              <div className="job-admin-actions">
                <form action={renewJob} className="renew-form">
                  <input name="id" type="hidden" value={job.id} />
                  <label>
                    <span>Dní</span>
                    <input className="field" min="1" name="days" type="number" defaultValue={30} />
                  </label>
                  <label>
                    <span>Top dní</span>
                    <input className="field" min="0" name="topDays" type="number" defaultValue={job.isTop ? 14 : 0} />
                  </label>
                  <label className="full">
                    <span>Zvýraznění</span>
                    <input className="field" name="highlightColor" defaultValue={job.highlightColor ?? ""} placeholder="#fff7ed" />
                  </label>
                  <button className="button secondary full" type="submit">
                    <RotateCw size={16} /> Obnovit / topovat
                  </button>
                </form>
                <div className="admin-button-row">
                  <Link className="admin-icon-link" href={`/admin/jobs/${job.id}/edit`}><Pencil size={16} /> Editovat</Link>
                  <Link className="admin-icon-link" href={`/jobs/${job.slug}`}><Eye size={16} /> Náhled</Link>
                </div>
                <form action={expireJob}>
                  <input name="id" type="hidden" value={job.id} />
                  <button className="button danger full" type="submit">Skrýt inzerát</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Poslední reakce</h2>
            <p>Rychlý přehled nejnovějších odpovědí na pracovní nabídky.</p>
          </div>
          <ArrowUpRight size={20} />
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
