import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Eye, FilePenLine, MessageSquareText } from "lucide-react";
import { JobReviewStatus, JobStatus } from "@prisma/client";
import { ClientShell } from "@/components/ClientShell";
import { requireClient } from "@/lib/client-auth";
import { jobReviewStatusLabels, jobStatusLabels } from "@/lib/business-rules";
import { dateCs, dateTimeCs, money, salaryRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function isEditable(reviewStatus: JobReviewStatus) {
  return reviewStatus === JobReviewStatus.DRAFT || reviewStatus === JobReviewStatus.CHANGES_REQUESTED || reviewStatus === JobReviewStatus.REJECTED;
}

export default async function ClientJobDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const client = await requireClient();
  const { id } = await params;
  const query = await searchParams;
  const job = await prisma.jobPost.findFirst({
    where: { id, companyId: client.companyId },
    include: {
      city: true,
      category: true,
      education: true,
      employmentType: true,
      package: true,
      invoices: { orderBy: { issuedAt: "desc" } },
      reviewComments: { orderBy: { createdAt: "desc" } },
      _count: { select: { applications: true } }
    }
  });
  if (!job) notFound();

  const activities = await prisma.activityLog.findMany({
    where: { entityType: "jobPost", entityId: job.id },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return (
    <ClientShell>
      <div className="client-page-head">
        <div>
          <span className="admin-kicker">Detail inzerátu</span>
          <h1>{job.title}</h1>
          <p>{job.shortIntro}</p>
        </div>
        <div className="client-form-actions">
          {isEditable(job.reviewStatus) && <Link className="button secondary" href={`/klient/inzeraty/${job.id}/upravit`}><FilePenLine size={18} /> Upravit</Link>}
          {job.status === JobStatus.ACTIVE && <Link className="button" href={`/jobs/${job.slug}`} target="_blank"><ArrowUpRight size={18} /> Veřejný detail</Link>}
        </div>
      </div>

      {query.notice === "submitted" && <p className="client-notice">Inzerát je odeslaný redakci ke schválení.</p>}
      {query.notice === "saved" && <p className="client-notice">Koncept je uložený.</p>}

      <section className="client-detail-grid">
        <article className="client-card">
          <span className={`status-pill status-${job.reviewStatus.toLowerCase()}`}>{jobReviewStatusLabels[job.reviewStatus]}</span>
          <span className={`status-pill status-${job.status.toLowerCase()}`}>{jobStatusLabels[job.status]}</span>
          <h2>Publikace</h2>
          <div className="client-facts">
            <div><span>Aktivní od</span><strong>{dateCs(job.activeFrom)}</strong></div>
            <div><span>Aktivní do</span><strong>{dateCs(job.activeUntil)}</strong></div>
            <div><span>Lokalita</span><strong>{job.city.name}</strong></div>
            <div><span>Obor</span><strong>{job.category.name}</strong></div>
          </div>
        </article>

        <article className="client-card">
          <Eye size={22} />
          <h2>Statistiky</h2>
          <div className="client-facts">
            <div><span>Zobrazení</span><strong>{job.views}</strong></div>
            <div><span>Reakce</span><strong>{job._count.applications}</strong></div>
            <div><span>Mzda</span><strong>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</strong></div>
            <div><span>Balíček</span><strong>{job.package?.name ?? "Bez balíčku"}</strong></div>
          </div>
        </article>

        <article className="client-card">
          <h2>Finance</h2>
          <div className="admin-list compact">
            {job.invoices.map((invoice) => (
              <div className="admin-list-row" key={invoice.id}>
                <div>
                  <strong>{invoice.number ?? "Faktura bez čísla"}</strong>
                  <span>{dateCs(invoice.issuedAt)} · {invoice.status}</span>
                </div>
                <em>{money(invoice.amountCzk)}</em>
              </div>
            ))}
            {job.invoices.length === 0 && <p className="admin-empty">Faktura vznikne po schválení redakcí.</p>}
          </div>
        </article>

        <article className="client-card">
          <MessageSquareText size={22} />
          <h2>Komunikace s redakcí</h2>
          <div className="admin-list compact">
            {job.reviewComments.map((comment) => (
              <div className="admin-list-row" key={comment.id}>
                <div>
                  <strong>{comment.message}</strong>
                  <span>{comment.authorEmail ?? comment.authorType} · {dateTimeCs(comment.createdAt)}</span>
                </div>
              </div>
            ))}
            {job.reviewComments.length === 0 && <p className="admin-empty">Zatím bez komentářů.</p>}
          </div>
        </article>

        <article className="client-card client-card-wide">
          <h2>Obsah</h2>
          <div className="client-copy-preview">
            <section><strong>Náplň práce</strong><p>{job.description}</p></section>
            <section><strong>Požadavky</strong><p>{job.requirements || "Bez specifikace."}</p></section>
            <section><strong>Benefity</strong><p>{job.benefits || "Bez specifikace."}</p></section>
          </div>
        </article>

        <article className="client-card client-card-wide">
          <h2>Auditní historie inzerátu</h2>
          <div className="admin-list compact">
            {activities.map((activity) => (
              <div className="admin-list-row" key={activity.id}>
                <div>
                  <strong>{activity.summary}</strong>
                  <span>{activity.actorEmail ?? activity.actorType} · {dateTimeCs(activity.createdAt)}</span>
                </div>
              </div>
            ))}
            {activities.length === 0 && <p className="admin-empty">Historie se zobrazí po prvních změnách.</p>}
          </div>
        </article>
      </section>
    </ClientShell>
  );
}
