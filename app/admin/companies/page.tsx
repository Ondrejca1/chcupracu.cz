import Link from "next/link";
import { Building2, CalendarClock, CircleDollarSign, Search, UsersRound } from "lucide-react";
import { JobStatus, PaymentStatus, type Prisma } from "@prisma/client";
import { AdminDataTable } from "@/components/AdminDataTable";
import { AdminEmptyState } from "@/components/AdminEmptyState";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminShell } from "@/components/AdminShell";
import { AdminStatusPill } from "@/components/AdminStatusPill";
import { AdminToolbar } from "@/components/AdminToolbar";
import { dateCs, money } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CompanyPipelineStatus = "active" | "renewal" | "unpaid" | "lead" | "dormant";

const statusLabels: Record<CompanyPipelineStatus, string> = {
  active: "Aktivní klient",
  renewal: "K obnově",
  unpaid: "Hlídá finance",
  lead: "Lead",
  dormant: "Spící klient"
};

function statusTone(status: CompanyPipelineStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success";
  if (status === "unpaid") return "danger";
  if (status === "renewal") return "warning";
  if (status === "lead") return "info";
  return "neutral";
}

function companyStatus(company: {
  jobs: { status: JobStatus; activeUntil: Date | null; updatedAt: Date }[];
  invoices: { status: PaymentStatus }[];
}): CompanyPipelineStatus {
  const now = new Date();
  const activeJobs = company.jobs.filter((job) => job.status === JobStatus.ACTIVE && (!job.activeUntil || job.activeUntil >= now)).length;
  const expiredJobs = company.jobs.filter((job) => job.status === JobStatus.EXPIRED || (job.activeUntil && job.activeUntil < now)).length;
  const unpaidInvoices = company.invoices.filter((invoice) => invoice.status === PaymentStatus.UNPAID).length;
  const latestJob = company.jobs[0];
  const dormantLimit = new Date(now.getTime() - 60 * 86_400_000);

  if (unpaidInvoices > 0) return "unpaid" satisfies CompanyPipelineStatus;
  if (activeJobs > 0) return "active" satisfies CompanyPipelineStatus;
  if (expiredJobs > 0) return "renewal" satisfies CompanyPipelineStatus;
  if (!latestJob) return "lead" satisfies CompanyPipelineStatus;
  if (latestJob.updatedAt < dormantLimit) return "dormant" satisfies CompanyPipelineStatus;
  return "renewal" satisfies CompanyPipelineStatus;
}

export default async function AdminCompaniesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requirePermission("companies:write");
  const params = await searchParams;
  const q = params.q?.trim();
  const selectedStatus = Object.keys(statusLabels).includes(params.status ?? "") ? params.status as CompanyPipelineStatus : "";
  const where: Prisma.CompanyWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { ico: { contains: q, mode: "insensitive" } }
    ];
  }

  const companiesRaw = await prisma.company.findMany({
    where,
    include: {
      clientUsers: { select: { id: true, email: true, name: true, status: true, lastLoginAt: true }, take: 3 },
      invoices: { select: { id: true, status: true, amountCzk: true, issuedAt: true, paidAt: true }, orderBy: { issuedAt: "desc" }, take: 20 },
      jobs: {
        select: {
          id: true,
          title: true,
          status: true,
          activeUntil: true,
          updatedAt: true,
          views: true,
          _count: { select: { applications: true } }
        },
        orderBy: { updatedAt: "desc" },
        take: 8
      },
      activityLogs: { select: { id: true, summary: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { jobs: true, invoices: true, clientUsers: true } }
    },
    orderBy: { updatedAt: "desc" },
    take: 200
  });

  const companies = companiesRaw
    .map((company) => {
      const pipelineStatus = companyStatus(company);
      const activeJobs = company.jobs.filter((job) => job.status === JobStatus.ACTIVE).length;
      const unpaidInvoices = company.invoices.filter((invoice) => invoice.status === PaymentStatus.UNPAID);
      const paidRevenue = company.invoices.filter((invoice) => invoice.status === PaymentStatus.PAID).reduce((sum, invoice) => sum + invoice.amountCzk, 0);
      const latestActivity = company.activityLogs[0]?.createdAt ?? company.jobs[0]?.updatedAt ?? company.updatedAt;
      return { ...company, pipelineStatus, activeJobs, unpaidInvoices, paidRevenue, latestActivity };
    })
    .filter((company) => !selectedStatus || company.pipelineStatus === selectedStatus);

  const pipelineCounts = Object.keys(statusLabels).reduce((acc, status) => {
    acc[status as CompanyPipelineStatus] = companiesRaw.filter((company) => companyStatus(company) === status).length;
    return acc;
  }, {} as Record<CompanyPipelineStatus, number>);
  const totalRevenue = companies.reduce((sum, company) => sum + company.paidRevenue, 0);
  const unpaidAmount = companies.reduce((sum, company) => sum + company.unpaidInvoices.reduce((invoiceSum, invoice) => invoiceSum + invoice.amountCzk, 0), 0);

  return (
    <AdminShell>
      <AdminPageHeader
        actions={<Link className="button" href="/admin/jobs/new">Nový inzerát</Link>}
        description="CRM pohled na firmy, klientské účty, inzeráty, faktury a obchodní příležitosti k obnově."
        eyebrow="Obchod a klienti"
        title="Firmy"
      />

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><Building2 size={22} /><span>Firmy ve výběru</span><strong>{companies.length}</strong><small>zobrazeno max. 200 firem</small></article>
        <article className="admin-stat"><UsersRound size={22} /><span>Aktivní klienti</span><strong>{pipelineCounts.active}</strong><small>mají běžící inzerát</small></article>
        <article className="admin-stat"><CalendarClock size={22} /><span>K obnově</span><strong>{pipelineCounts.renewal}</strong><small>obchodní follow-up</small></article>
        <article className="admin-stat"><CircleDollarSign size={22} /><span>Nezaplaceno</span><strong>{money(unpaidAmount)}</strong><small>otevřené finance</small></article>
        <article className="admin-stat"><span>Uhrazeno</span><strong>{money(totalRevenue)}</strong><small>v aktuálním výběru</small></article>
      </section>

      <AdminToolbar className="admin-card companies-toolbar">
        <div className="admin-card-head">
          <div>
            <h2>Filtry firem</h2>
            <p>Najděte firmu podle názvu, kontaktu, e-mailu nebo IČO a rozdělte obchodní pipeline.</p>
          </div>
        </div>
        <form className="admin-filter-bar">
          <input className="field" name="q" placeholder="Firma, kontakt, e-mail nebo IČO" defaultValue={params.q ?? ""} />
          <select className="select" name="status" defaultValue={selectedStatus}>
            <option value="">Všechny stavy</option>
            {Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
          </select>
          <button className="button" type="submit"><Search size={16} /> Filtrovat</button>
          <Link className="button secondary" href="/admin/companies">Vyčistit</Link>
        </form>
      </AdminToolbar>

      <section className="admin-card companies-board">
        <div className="admin-card-head">
          <div>
            <h2>Obchodní přehled firem</h2>
            <p>Rychlá orientace: kdo je aktivní, koho obnovit, kde visí platba a kde existuje klientský účet.</p>
          </div>
          <span className="meta">{companies.length} položek</span>
        </div>
        <AdminDataTable>
          <table className="table admin-table companies-admin-table">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Stav</th>
                <th>Inzeráty</th>
                <th>Finance</th>
                <th>Klientský účet</th>
                <th>Poslední aktivita</th>
                <th>Akce</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const latestJob = company.jobs[0];
                const totalApplications = company.jobs.reduce((sum, job) => sum + job._count.applications, 0);
                const unpaidSum = company.unpaidInvoices.reduce((sum, invoice) => sum + invoice.amountCzk, 0);

                return (
                  <tr key={company.id}>
                    <td className="company-crm-cell">
                      <strong>{company.name}</strong>
                      <span>{company.contactName ?? "bez kontaktní osoby"} · {company.email ?? "bez e-mailu"}</span>
                    </td>
                    <td><AdminStatusPill tone={statusTone(company.pipelineStatus)}>{statusLabels[company.pipelineStatus]}</AdminStatusPill></td>
                    <td>
                      <strong>{company.activeJobs} aktivní / {company._count.jobs} celkem</strong>
                      <span className="meta">{totalApplications} reakcí · {latestJob ? latestJob.title : "bez inzerátu"}</span>
                    </td>
                    <td>
                      <strong>{company.unpaidInvoices.length ? money(unpaidSum) : money(company.paidRevenue)}</strong>
                      <span className="meta">{company.unpaidInvoices.length ? `${company.unpaidInvoices.length} nezaplaceno` : "uhrazené faktury"}</span>
                    </td>
                    <td>
                      <strong>{company._count.clientUsers}</strong>
                      <span className="meta">{company.clientUsers[0]?.email ?? "bez klientského účtu"}</span>
                    </td>
                    <td>
                      <strong>{dateCs(company.latestActivity)}</strong>
                      <span className="meta">{company.activityLogs[0]?.summary ?? "poslední změna firmy/inzerátu"}</span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link className="button ghost compact" href={`/admin/jobs?q=${encodeURIComponent(company.name)}`}>Inzeráty</Link>
                        <Link className="button ghost compact" href={`/admin/finance?company=${encodeURIComponent(company.name)}`}>Finance</Link>
                        <Link className="button secondary compact" href={`/firmy/${company.slug}`} target="_blank">Profil</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <AdminEmptyState text="Zkuste změnit filtr, případně založte první inzerát pro novou firmu." title="Podle aktuálních filtrů tu není žádná firma." />
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
