import { createCity, createPackage, toggleCity, togglePackage } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentStatus, type Prisma } from "@prisma/client";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ company?: string; min?: string; max?: string; status?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const invoiceWhere: Prisma.InvoiceWhereInput = {};
  if (params.company) invoiceWhere.company = { name: { contains: params.company, mode: "insensitive" } };
  if (params.status && Object.values(PaymentStatus).includes(params.status as PaymentStatus)) {
    invoiceWhere.status = params.status as PaymentStatus;
  }
  if (params.min || params.max) {
    const amountFilter: Prisma.IntFilter = {};
    if (params.min) amountFilter.gte = Number(params.min);
    if (params.max) amountFilter.lte = Number(params.max);
    invoiceWhere.amountCzk = amountFilter;
  }
  const [cities, packages, invoices] = await Promise.all([
    prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.pricingPackage.findMany({ orderBy: { priceCzk: "asc" } }),
    prisma.invoice.findMany({ where: invoiceWhere, include: { company: true, package: true, job: true }, orderBy: { issuedAt: "desc" }, take: 30 })
  ]);

  return (
    <AdminShell>
      <h1>Číselníky a finance</h1>
      <div className="grid">
        <section className="card">
          <h2>Města</h2>
          <form action={createCity} className="cards" style={{ marginBottom: 16 }}>
            <input className="field" name="name" placeholder="Nové město" required />
            <input className="field" name="region" placeholder="Region / poznámka" />
            <button className="button" type="submit">Přidat město</button>
          </form>
          {cities.map((city) => (
            <form action={toggleCity} className="meta" key={city.id} style={{ alignItems: "center", justifyContent: "space-between" }}>
              <span>{city.name}{city.isDefault ? " · výchozí" : ""} · {city.isActive ? "aktivní" : "skryté"}</span>
              <input name="id" type="hidden" value={city.id} />
              <input name="isActive" type="hidden" value={String(city.isActive)} />
              <button className="button secondary" type="submit">{city.isActive ? "Skrýt" : "Zobrazit"}</button>
            </form>
          ))}
        </section>
        <section className="card">
          <h2>Balíčky</h2>
          <form action={createPackage} className="cards" style={{ marginBottom: 16 }}>
            <input className="field" name="name" placeholder="Název balíčku" required />
            <input className="field" min="1" name="durationDays" placeholder="Počet dní" required type="number" />
            <input className="field" min="0" name="priceCzk" placeholder="Cena Kč" required type="number" />
            <input className="field" name="highlightColor" placeholder="Barva zvýraznění, např. #fff7ed" />
            <input className="field" min="0" name="topDays" placeholder="Topovat dní" type="number" />
            <label><input name="isTopPlacement" type="checkbox" /> Balíček topuje inzerát</label>
            <button className="button" type="submit">Přidat balíček</button>
          </form>
          {packages.map((item) => (
            <form action={togglePackage} className="meta" key={item.id} style={{ alignItems: "center", justifyContent: "space-between" }}>
              <span><strong>{item.name}</strong> · {item.durationDays} dní · {money(item.priceCzk)} · {item.isTopPlacement ? `TOP ${item.topDays ?? ""} dní` : "bez topování"} · {item.isActive ? "aktivní" : "skrytý"}</span>
              <input name="id" type="hidden" value={item.id} />
              <input name="isActive" type="hidden" value={String(item.isActive)} />
              <button className="button secondary" type="submit">{item.isActive ? "Skrýt" : "Zobrazit"}</button>
            </form>
          ))}
        </section>
      </div>
      <section className="admin-panel" style={{ marginTop: 24 }}>
        <form className="form-grid" style={{ padding: 16 }}>
          <input className="field" name="company" placeholder="Filtrovat podle firmy" defaultValue={params.company ?? ""} />
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            <option value="UNPAID">Nezaplaceno</option>
            <option value="PAID">Zaplaceno</option>
            <option value="CANCELLED">Storno</option>
          </select>
          <input className="field" name="min" placeholder="Částka od" defaultValue={params.min ?? ""} />
          <input className="field" name="max" placeholder="Částka do" defaultValue={params.max ?? ""} />
          <button className="button full" type="submit">Filtrovat finance</button>
        </form>
        <table className="table">
          <thead>
            <tr>
              <th>Firma</th>
              <th>Inzerát</th>
              <th>Částka</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.company.name}</td>
                <td>{invoice.job?.title ?? invoice.package?.name ?? "-"}</td>
                <td>{money(invoice.amountCzk)}</td>
                <td>{invoice.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
