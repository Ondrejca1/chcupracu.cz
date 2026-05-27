import Link from "next/link";
import { expireJob, renewJob } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, salaryRange } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminJobsPage() {
  await requireAdmin();
  const [jobs, applications] = await Promise.all([
    prisma.jobPost.findMany({
      include: { company: true, city: true, applications: true, package: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.application.findMany({
      include: { job: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return (
    <AdminShell>
      <h1>Inzeráty</h1>
      <p>Samostatný přehled všech inzerátů. Odtud se obnovuje, topuje, skrývá a otevírá náhled/editace.</p>
      <p><Link className="button" href="/admin/jobs/new">Přidat inzerát</Link></p>
      <section className="admin-panel" style={{ marginTop: 24 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Pozice</th>
              <th>Firma</th>
              <th>Stav</th>
              <th>Aktivní do</th>
              <th>Reakce</th>
              <th>Akce</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <strong>{job.title}</strong>
                  <div className="meta">{job.city.name} · {salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</div>
                </td>
                <td>{job.company.name}</td>
                <td>{job.status}</td>
                <td>{dateCs(job.activeUntil)}</td>
                <td>{job.applications.length}</td>
                <td>
                  <form action={renewJob} style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                    <input name="id" type="hidden" value={job.id} />
                    <input className="field" min="1" name="days" type="number" defaultValue={30} placeholder="Obnovit dní" />
                    <input className="field" min="0" name="topDays" type="number" defaultValue={job.isTop ? 14 : 0} placeholder="Topovat dní" />
                    <input className="field" name="highlightColor" defaultValue={job.highlightColor ?? ""} placeholder="Barva" />
                    <button className="button secondary" type="submit">Obnovit</button>
                  </form>
                  <form action={expireJob}>
                    <input name="id" type="hidden" value={job.id} />
                    <button className="button danger" type="submit">Skrýt</button>
                  </form>
                  <Link href={`/admin/jobs/${job.id}/edit`}>Editovat</Link>
                  <Link href={`/jobs/${job.slug}`}>Náhled</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="admin-panel" style={{ marginTop: 24, padding: 16 }}>
        <h2>Poslední reakce</h2>
        {applications.map((application) => (
          <div className="card" key={application.id} style={{ marginBottom: 10 }}>
            <strong>{application.name}</strong> odpověděl/a na {application.job.title}
            <p>{application.message}</p>
            <div className="meta">{application.email} · {application.phone ?? "bez telefonu"} · {application.job.company.name}</div>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
