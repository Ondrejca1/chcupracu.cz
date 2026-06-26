import Link from "next/link";
import { CircleDollarSign, ReceiptText } from "lucide-react";
import { PaymentStatus, type Prisma } from "@prisma/client";
import { ClientShell } from "@/components/ClientShell";
import { requireClient } from "@/lib/client-auth";
import { dateCs, money } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const statusLabels: Record<PaymentStatus, string> = {
  UNPAID: "Nezaplaceno",
  PAID: "Zaplaceno",
  CANCELLED: "Storno"
};

export default async function ClientFinancePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const client = await requireClient();
  const params = await searchParams;
  const where: Prisma.InvoiceWhereInput = { companyId: client.companyId };
  if (params.status && Object.values(PaymentStatus).includes(params.status as PaymentStatus)) where.status = params.status as PaymentStatus;

  const [invoices, paid, unpaid] = await Promise.all([
    prisma.invoice.findMany({ where, include: { job: true, package: true }, orderBy: { issuedAt: "desc" }, take: 100 }),
    prisma.invoice.aggregate({ where: { companyId: client.companyId, status: PaymentStatus.PAID }, _sum: { amountCzk: true }, _count: true }),
    prisma.invoice.aggregate({ where: { companyId: client.companyId, status: PaymentStatus.UNPAID }, _sum: { amountCzk: true }, _count: true })
  ]);

  return (
    <ClientShell>
      <div className="client-page-head">
        <div>
          <span className="admin-kicker">Finance</span>
          <h1>Faktury a platby</h1>
          <p>Přehled částek navázaných na inzeráty a vybrané balíčky.</p>
        </div>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><CircleDollarSign size={22} /><span>Zaplaceno</span><strong>{money(paid._sum.amountCzk)}</strong><small>{paid._count} faktur</small></article>
        <article className="admin-stat"><ReceiptText size={22} /><span>Nezaplaceno</span><strong>{money(unpaid._sum.amountCzk)}</strong><small>{unpaid._count} položek</small></article>
      </section>

      <section className="client-filter-panel">
        <form className="admin-filter-bar">
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            {Object.values(PaymentStatus).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
          </select>
          <button className="button" type="submit">Filtrovat</button>
          <Link className="button secondary" href="/klient/finance">Vyčistit</Link>
        </form>
      </section>

      <section className="client-card">
        <div className="admin-card-head">
          <div>
            <h2>Faktury</h2>
            <p>Stavy mění redakce ve finanční administraci.</p>
          </div>
        </div>
        <table className="table admin-table">
          <thead>
            <tr><th>Inzerát / balíček</th><th>Částka</th><th>Vystaveno</th><th>Stav</th></tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <strong>{invoice.job?.title ?? invoice.package?.name ?? "Fakturace"}</strong>
                  <div className="meta">{invoice.number ?? "bez čísla"}</div>
                </td>
                <td>{money(invoice.amountCzk)}</td>
                <td>{dateCs(invoice.issuedAt)}</td>
                <td><span className={`status-pill status-${invoice.status.toLowerCase()}`}>{statusLabels[invoice.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && <p className="admin-empty">Zatím tu nejsou žádné faktury.</p>}
      </section>
    </ClientShell>
  );
}
