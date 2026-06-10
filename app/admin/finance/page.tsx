import { PaymentStatus, type Prisma } from "@prisma/client";
import { BarChart3, CircleDollarSign, ReceiptText } from "lucide-react";
import { createMissingInvoicesFromJobs, updateInvoiceStatus } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, money } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Nezaplaceno",
  PAID: "Zaplaceno",
  CANCELLED: "Storno"
};

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ company?: string; status?: string; min?: string; max?: string }> }) {
  await requirePermission("finance:write");
  const params = await searchParams;
  const where: Prisma.InvoiceWhereInput = {};
  if (params.company) where.company = { name: { contains: params.company, mode: "insensitive" } };
  if (params.status && Object.values(PaymentStatus).includes(params.status as PaymentStatus)) where.status = params.status as PaymentStatus;
  if (params.min || params.max) {
    where.amountCzk = {
      ...(params.min ? { gte: Number(params.min) } : {}),
      ...(params.max ? { lte: Number(params.max) } : {})
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [invoices, paidTotal, unpaidTotal, monthPaid, paidInvoices, allInvoices, jobsWithoutInvoice] = await Promise.all([
    prisma.invoice.findMany({ where, include: { company: true, package: true, job: true }, orderBy: { issuedAt: "desc" }, take: 100 }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.PAID }, _sum: { amountCzk: true }, _count: true }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.UNPAID }, _sum: { amountCzk: true }, _count: true }),
    prisma.invoice.aggregate({ where: { status: PaymentStatus.PAID, paidAt: { gte: monthStart } }, _sum: { amountCzk: true }, _count: true }),
    prisma.invoice.findMany({ where: { status: PaymentStatus.PAID }, include: { company: true }, take: 1000 }),
    prisma.invoice.findMany({ select: { status: true, amountCzk: true }, take: 2000 }),
    prisma.jobPost.count({ where: { packageId: { not: null }, invoices: { none: {} } } })
  ]);
  const byCompany = Array.from(
    paidInvoices.reduce((map, invoice) => {
      const current = map.get(invoice.companyId) ?? { id: invoice.companyId, name: invoice.company.name, amount: 0 };
      current.amount += invoice.amountCzk;
      map.set(invoice.companyId, current);
      return map;
    }, new Map<string, { id: string; name: string; amount: number }>())
  ).map(([, value]) => value).sort((a, b) => b.amount - a.amount).slice(0, 8);
  const byStatus = Object.values(PaymentStatus).map((status) => {
    const matching = allInvoices.filter((invoice) => invoice.status === status);
    return { status, amount: matching.reduce((sum, invoice) => sum + invoice.amountCzk, 0), count: matching.length };
  });
  const maxCompany = Math.max(...byCompany.map((item) => item.amount), 1);
  const exportParams = new URLSearchParams();
  if (params.company) exportParams.set("company", params.company);
  if (params.status) exportParams.set("status", params.status);
  if (params.min) exportParams.set("min", params.min);
  if (params.max) exportParams.set("max", params.max);
  const exportHref = `/admin/finance/export${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Finance</span>
          <h1>Platby a faktury</h1>
          <p>Přehled kdo kolik zaplatil, co je otevřené a jaký je výkon balíčků.</p>
        </div>
        <a className="button secondary" href={exportHref}>Export CSV</a>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><CircleDollarSign size={22} /><span>Zaplaceno celkem</span><strong>{money(paidTotal._sum.amountCzk)}</strong><small>{paidTotal._count} faktur</small></article>
        <article className="admin-stat"><ReceiptText size={22} /><span>Nezaplaceno</span><strong>{money(unpaidTotal._sum.amountCzk)}</strong><small>{unpaidTotal._count} položek</small></article>
        <article className="admin-stat"><BarChart3 size={22} /><span>Tento měsíc</span><strong>{money(monthPaid._sum.amountCzk)}</strong><small>{monthPaid._count} zaplacených</small></article>
        <article className="admin-stat"><span>Výsledek filtru</span><strong>{invoices.length}</strong><small>zobrazeno max. 100 faktur</small></article>
      </section>

      {jobsWithoutInvoice > 0 && (
        <section className="admin-card finance-repair">
          <div>
            <h2>Chybí faktury k inzerátům</h2>
            <p>{jobsWithoutInvoice} inzerátů má nastavený balíček, ale nemá fakturu. Doplněním vzniknou nezaplacené faktury podle ceny balíčku.</p>
          </div>
          <form action={createMissingInvoicesFromJobs}>
            <button className="button" type="submit">Doplnit chybějící faktury</button>
          </form>
        </section>
      )}

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Filtry financí</h2>
            <p>Vyhledávání podle firmy, stavu a částky.</p>
          </div>
        </div>
        <form className="admin-filter-bar">
          <input className="field" name="company" placeholder="Firma" defaultValue={params.company ?? ""} />
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            {Object.values(PaymentStatus).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
          <input className="field" name="min" placeholder="Částka od" defaultValue={params.min ?? ""} />
          <input className="field" name="max" placeholder="Částka do" defaultValue={params.max ?? ""} />
          <button className="button" type="submit">Filtrovat</button>
        </form>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-card">
          <div className="admin-card-head"><div><h2>Největší plátci</h2><p>Součet zaplacených faktur podle firmy.</p></div></div>
          <div className="finance-bars">
            {byCompany.map((item) => {
              const value = item.amount;
              return (
                <div className="finance-bar" key={item.id}>
                  <div><strong>{item.name}</strong><span>{money(value)}</span></div>
                  <meter min={0} max={maxCompany} value={value} />
                </div>
              );
            })}
          </div>
        </article>
        <article className="admin-card">
          <div className="admin-card-head"><div><h2>Stavy plateb</h2><p>Rozdělení objemu podle stavu faktur.</p></div></div>
          <div className="finance-status-grid">
            {byStatus.map((item) => (
              <div className="finance-status" key={item.status}>
                <span>{statusLabels[item.status]}</span>
                <strong>{money(item.amount)}</strong>
                <small>{item.count} faktur</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head"><div><h2>Faktury</h2><p>Rychlá změna stavu a kontrola vazby na inzerát nebo balíček.</p></div></div>
        <table className="table admin-table">
          <thead>
            <tr><th>Firma</th><th>Inzerát / balíček</th><th>Částka</th><th>Vystaveno</th><th>Stav</th><th>Akce</th></tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td><strong>{invoice.company.name}</strong><div className="meta">{invoice.number ?? "bez čísla"}</div></td>
                <td>{invoice.job?.title ?? invoice.package?.name ?? "-"}</td>
                <td>{money(invoice.amountCzk)}</td>
                <td>{dateCs(invoice.issuedAt)}</td>
                <td><span className={`status-pill status-${invoice.status.toLowerCase()}`}>{statusLabels[invoice.status]}</span></td>
                <td>
                  <form action={updateInvoiceStatus} className="inline-form">
                    <input name="id" type="hidden" value={invoice.id} />
                    <select className="select" name="status" defaultValue={invoice.status}>
                      {Object.values(PaymentStatus).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                    </select>
                    <button className="button secondary" type="submit">Uložit</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
