import Link from "next/link";
import { BriefcaseBusiness, CircleDollarSign, Eye, FilePenLine, Plus, Send, UsersRound } from "lucide-react";
import { JobReviewStatus, JobStatus, PaymentStatus } from "@prisma/client";
import { ClientShell } from "@/components/ClientShell";
import { requireClient } from "@/lib/client-auth";
import { jobReviewStatusLabels, jobStatusLabels } from "@/lib/business-rules";
import { dateCs, dateTimeCs, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function ClientDashboardPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  const client = await requireClient();
  const params = await searchParams;
  const [jobs, invoices, activities] = await Promise.all([
    prisma.jobPost.findMany({
      where: { companyId: client.companyId },
      include: {
        package: true,
        invoices: { orderBy: { issuedAt: "desc" }, take: 1 },
        _count: { select: { applications: true } }
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8
    }),
    prisma.invoice.findMany({
      where: { companyId: client.companyId },
      include: { job: true, package: true },
      orderBy: { issuedAt: "desc" },
      take: 6
    }),
    prisma.activityLog.findMany({
      where: { companyId: client.companyId },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);

  const activeJobs = jobs.filter((job) => job.status === JobStatus.ACTIVE).length;
  const submittedJobs = jobs.filter((job) => job.reviewStatus === JobReviewStatus.SUBMITTED || job.reviewStatus === JobReviewStatus.IN_REVIEW).length;
  const unpaidTotal = invoices.filter((invoice) => invoice.status === PaymentStatus.UNPAID).reduce((sum, invoice) => sum + invoice.amountCzk, 0);
  const views = jobs.reduce((sum, job) => sum + job.views, 0);
  const applications = jobs.reduce((sum, job) => sum + job._count.applications, 0);

  return (
    <ClientShell>
      <div className="client-page-head">
        <div>
          <span className="admin-kicker">Klientská sekce</span>
          <h1>Přehled firmy {client.company.name}</h1>
          <p>Stavy inzerátů, finance a poslední kroky redakce na jednom místě.</p>
        </div>
        <Link className="button" href="/klient/inzeraty/novy">
          <Plus size={18} /> Zadat inzerát
        </Link>
      </div>

      {params.notice === "registered" && <p className="client-notice">Účet je založený. Můžete zadat první inzerát.</p>}
      {params.error === "locked" && <p className="client-alert">Tento inzerát už je v redakčním schvalování a nejde ho teď upravit.</p>}

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><BriefcaseBusiness size={22} /><span>Aktivní inzeráty</span><strong>{activeJobs}</strong><small>veřejně dostupné nabídky</small></article>
        <article className="admin-stat"><Send size={22} /><span>Ve schvalování</span><strong>{submittedJobs}</strong><small>čekají na redakci</small></article>
        <article className="admin-stat"><CircleDollarSign size={22} /><span>Nezaplaceno</span><strong>{money(unpaidTotal)}</strong><small>otevřené finance</small></article>
        <article className="admin-stat"><Eye size={22} /><span>Výkon</span><strong>{views}</strong><small>{applications} reakcí</small></article>
      </section>

      <section className="client-dashboard-grid">
        <article className="client-card">
          <div className="admin-card-head">
            <div>
              <h2>Poslední inzeráty</h2>
              <p>Rychlá kontrola stavu, výkonu a fakturace.</p>
            </div>
            <Link className="admin-link" href="/klient/inzeraty">Všechny</Link>
          </div>
          <div className="admin-list compact">
            {jobs.map((job) => (
              <Link className="admin-list-row" href={`/klient/inzeraty/${job.id}`} key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{jobReviewStatusLabels[job.reviewStatus]} · {jobStatusLabels[job.status]} · {job.views} zobrazení · {job._count.applications} reakcí</span>
                </div>
                <em>{job.package?.name ?? "bez balíčku"}</em>
              </Link>
            ))}
            {jobs.length === 0 && (
              <div className="client-empty">
                <strong>Zatím tu není žádný inzerát.</strong>
                <Link className="button secondary" href="/klient/inzeraty/novy"><FilePenLine size={17} /> Vytvořit první</Link>
              </div>
            )}
          </div>
        </article>

        <article className="client-card">
          <div className="admin-card-head">
            <div>
              <h2>Finance</h2>
              <p>Poslední faktury a platby navázané na inzeráty.</p>
            </div>
            <Link className="admin-link" href="/klient/finance">Detail</Link>
          </div>
          <div className="admin-list compact">
            {invoices.map((invoice) => (
              <div className="admin-list-row" key={invoice.id}>
                <div>
                  <strong>{invoice.job?.title ?? invoice.package?.name ?? "Fakturace"}</strong>
                  <span>{dateCs(invoice.issuedAt)} · {invoice.status}</span>
                </div>
                <em>{money(invoice.amountCzk)}</em>
              </div>
            ))}
            {invoices.length === 0 && <p className="admin-empty">Faktury vzniknou po schválení inzerátu redakcí.</p>}
          </div>
        </article>

        <article className="client-card client-card-wide">
          <div className="admin-card-head">
            <div>
              <h2>Historie účtu</h2>
              <p>Auditní stopa klientských a redakčních akcí.</p>
            </div>
            <UsersRound size={22} />
          </div>
          <div className="admin-list compact">
            {activities.map((activity) => (
              <div className="admin-list-row" key={activity.id}>
                <div>
                  <strong>{activity.summary}</strong>
                  <span>{activity.actorEmail ?? activity.actorType} · {dateTimeCs(activity.createdAt)}</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="admin-empty">Historie se začne plnit po prvních úpravách.</p>}
          </div>
        </article>
      </section>
    </ClientShell>
  );
}
