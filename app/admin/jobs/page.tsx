import Link from "next/link";
import { JobStatus, type Prisma } from "@prisma/client";
import { ArrowUpRight, Eye, Flame, Pencil, Plus, RotateCw } from "lucide-react";
import { expireJob, renewJob } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { dateCs, salaryRange } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeJobWhere, activeTopJobWhere, expiringJobWhere, jobStatusLabels, syncExpiredBusinessState } from "@/lib/business-rules";

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; city?: string; top?: string; homepage?: string }> }) {
  await requireAdmin();
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
  if (params.status && Object.values(JobStatus).includes(params.status as JobStatus)) where.status = params.status as JobStatus;
  if (params.city) where.cityId = params.city;
  if (params.top === "yes") where.isTop = true;
  if (params.top === "no") where.isTop = false;
  if (params.homepage === "yes") where.showOnHomepage = true;
  if (params.homepage === "no") where.showOnHomepage = false;

  const [jobs, applications, activeJobs, draftJobs, expiringJobs, topJobs, cities, totalMatches] = await Promise.all([
    prisma.jobPost.findMany({
      where,
      include: { company: true, city: true, package: true, _count: { select: { applications: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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
    prisma.jobPost.count({ where: activeJobWhere(now) }),
    prisma.jobPost.count({ where: { status: JobStatus.DRAFT } }),
    prisma.jobPost.count({ where: expiringJobWhere(now) }),
    prisma.jobPost.count({ where: activeTopJobWhere(now) }),
    prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.jobPost.count({ where })
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
            <h2>Filtry</h2>
            <p>Zobrazeno {jobs.length} z {totalMatches} nalezených inzerátů. Přehled je omezený na prvních 100 položek.</p>
          </div>
        </div>
        <form className="admin-filter-bar">
          <input className="field" name="q" placeholder="Název, firma nebo text" defaultValue={params.q ?? ""} />
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            {Object.values(JobStatus).map((status) => <option key={status} value={status}>{jobStatusLabels[status]}</option>)}
          </select>
          <select className="select" name="city" defaultValue={params.city ?? ""}>
            <option value="">Všechna města</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
          <select className="select" name="top" defaultValue={params.top ?? ""}>
            <option value="">Topování nerozhoduje</option>
            <option value="yes">Jen topované</option>
            <option value="no">Bez topování</option>
          </select>
          <select className="select" name="homepage" defaultValue={params.homepage ?? ""}>
            <option value="">Homepage nerozhoduje</option>
            <option value="yes">Zobrazené na homepage</option>
            <option value="no">Skryté z homepage</option>
          </select>
          <button className="button" type="submit">Filtrovat</button>
          <Link className="button secondary" href="/admin/jobs">Vyčistit</Link>
        </form>
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
                <span className={`status-pill status-${job.status.toLowerCase()}`}>{jobStatusLabels[job.status]}</span>
                {job.isTop && <span className="status-pill status-active"><Flame size={13} /> Topováno</span>}
                <h3>{job.title}</h3>
                <p>{job.shortIntro}</p>
                <div className="meta">
                  <strong>{job.company.name}</strong>
                  <span>{job.city.name}</span>
                  <span>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</span>
                  <span>{job._count.applications} reakcí</span>
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
                  <ConfirmSubmitButton className="button danger full" message={`Opravdu skrýt inzerát „${job.title}“ z veřejného webu?`}>
                    Skrýt inzerát
                  </ConfirmSubmitButton>
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
