import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationStatus, ApplicationTag } from "@prisma/client";
import { ArrowLeft, Mail, Phone, Send } from "lucide-react";
import { forwardApplicationToCompany, updateApplication } from "@/lib/actions/applications";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
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

export default async function AdminApplicationDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requirePermission("applications:write");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      communications: { orderBy: { createdAt: "desc" } },
      job: {
        include: {
          company: true,
          city: true
        }
      }
    }
  });

  if (!application) notFound();

  const companyEmail = application.job.contactEmail || application.job.company.email;

  return (
    <AdminShell>
      <AdminPageHeader
        actions={<Link className="button secondary" href="/admin/applications"><ArrowLeft size={16} /> Zpět na reakce</Link>}
        description={`${application.job.title} · ${application.job.company.name} · ${application.job.city.name}`}
        eyebrow="Detail reakce"
        title={application.name}
      />
      {query.notice === "forwarded" && <p className="admin-success">Reakce byla předána firmě.</p>}
      {query.error === "no-company-email" && <p className="admin-error">U inzerátu nebo firmy chybí e-mail pro předání.</p>}

      <section className="admin-dashboard-grid">
        <article className="admin-card application-detail-card">
          <div className="application-head">
            <AdminStatusPill tone={applicationStatusTone(application.status)}>{applicationStatusLabels[application.status]}</AdminStatusPill>
            <strong>{dateTimeCs(application.createdAt)}</strong>
          </div>
          <h2>Zpráva uchazeče</h2>
          <p>{application.message}</p>
          <div className="meta">
            <a className="admin-icon-link" href={`mailto:${application.email}?subject=Reakce na inzerát ${encodeURIComponent(application.job.title)}`}>
              <Mail size={16} /> {application.email}
            </a>
            {application.phone && (
              <a className="admin-icon-link" href={`tel:${application.phone}`}>
                <Phone size={16} /> {application.phone}
              </a>
            )}
          </div>
          <div className="meta application-tags">
            {application.tags.length > 0
              ? application.tags.map((tag) => <span className="job-chip" key={tag}>{applicationTagLabels[tag]}</span>)
              : <span className="job-chip">Bez štítků</span>}
          </div>
          <form action={forwardApplicationToCompany}>
            <input name="id" type="hidden" value={application.id} />
            <button className="button" type="submit" disabled={!companyEmail}>
              <Send size={16} /> Předat firmě
            </button>
          </form>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Zpracování</h2>
              <p>Stav, štítky, interní poznámka a nový zápis komunikace.</p>
            </div>
          </div>
          <form action={updateApplication} className="admin-form single">
            <input name="id" type="hidden" value={application.id} />
            <input name="returnTo" type="hidden" value={`/admin/applications/${application.id}`} />
            <label className="field-group">
              <span>Stav</span>
              <select className="select" name="status" defaultValue={application.status}>
                {Object.values(ApplicationStatus).map((status) => <option key={status} value={status}>{applicationStatusLabels[status]}</option>)}
              </select>
            </label>
            <label className="field-group">
              <span>Štítky</span>
              <div className="tag-check-grid">
                {Object.values(ApplicationTag).map((tag) => (
                  <label className="tag" key={tag}>
                    <input name="tags" type="checkbox" value={tag} defaultChecked={application.tags.includes(tag)} /> {applicationTagLabels[tag]}
                  </label>
                ))}
              </div>
            </label>
            <label className="field-group">
              <span>Interní poznámka</span>
              <textarea className="textarea textarea-short" name="internalNote" defaultValue={application.internalNote ?? ""} />
            </label>
            <label className="field-group">
              <span>Nový záznam komunikace</span>
              <textarea className="textarea textarea-short" name="communicationBody" placeholder="Voláno, e-mail odeslán, čekáme na reakci firmy..." />
              <input name="communicationChannel" type="hidden" value="note" />
            </label>
            <button className="button secondary" type="submit">Uložit změny</button>
          </form>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Historie komunikace</h2>
            <p>Chronologická stopa od příchozí reakce po interní poznámky a předání firmě.</p>
          </div>
        </div>
        <div className="timeline-list">
          {application.communications.map((item) => (
            <article className="timeline-item" key={item.id}>
              <span>{dateTimeCs(item.createdAt)} · {item.channel} · {item.direction}</span>
              <strong>{item.subject ?? "Záznam komunikace"}</strong>
              <p>{item.body}</p>
            </article>
          ))}
          {application.communications.length === 0 && <p className="admin-empty">Historie se začne plnit od dalšího zpracování reakce.</p>}
        </div>
      </section>
    </AdminShell>
  );
}
