import { createPackage, togglePackage, updatePackage } from "@/lib/actions/packages";
import { AdminShell } from "@/components/AdminShell";
import { money } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminPackagesPage() {
  await requirePermission("packages:write");
  const packages = await prisma.pricingPackage.findMany({ orderBy: [{ isActive: "desc" }, { priceCzk: "asc" }] });
  const activeCount = packages.filter((item) => item.isActive).length;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Obchodní produkty</span>
          <h1>Balíčky</h1>
          <p>Ceník pracovních inzerátů, délka zveřejnění, topování a zvýraznění.</p>
        </div>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><span>Aktivní balíčky</span><strong>{activeCount}</strong><small>viditelné pro redakci</small></article>
        <article className="admin-stat"><span>Nejlevnější</span><strong>{money(packages.filter((item) => item.isActive).sort((a, b) => a.priceCzk - b.priceCzk)[0]?.priceCzk)}</strong><small>aktivní produkt</small></article>
        <article className="admin-stat"><span>Top produkty</span><strong>{packages.filter((item) => item.isTopPlacement).length}</strong><small>obsahují topování</small></article>
        <article className="admin-stat"><span>Celkem</span><strong>{packages.length}</strong><small>včetně skrytých</small></article>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-card">
          <div className="admin-card-head"><div><h2>Nový balíček</h2><p>Produkt pro ruční zadání inzerátu a fakturaci.</p></div></div>
          <form action={createPackage} className="admin-form single">
            <label className="field-group"><span>Název</span><input className="field" name="name" required placeholder="Top 45" /></label>
            <label className="field-group"><span>Popis</span><textarea className="textarea textarea-short" name="description" placeholder="Co balíček obsahuje." /></label>
            <label className="field-group"><span>Délka zveřejnění</span><input className="field" min="1" name="durationDays" required type="number" defaultValue={30} /></label>
            <label className="field-group"><span>Cena Kč</span><input className="field" min="0" name="priceCzk" required type="number" /></label>
            <label className="field-group"><span>Barva zvýraznění</span><input className="field" name="highlightColor" placeholder="#fff7ed" /></label>
            <label className="field-group"><span>Top dní</span><input className="field" min="0" name="topDays" type="number" /></label>
            <label className="admin-check full"><input name="isTopPlacement" type="checkbox" /> Balíček obsahuje topování</label>
            <button className="button full" type="submit">Přidat balíček</button>
          </form>
        </article>

        <article className="admin-card">
          <div className="admin-card-head"><div><h2>Přehled ceníku</h2><p>Rychlá orientace v aktivních produktech.</p></div></div>
          <div className="package-preview-grid">
            {packages.filter((item) => item.isActive).map((item) => (
              <div className="package-preview" key={item.id} style={{ background: item.highlightColor ?? undefined }}>
                <span>{item.durationDays} dní</span>
                <strong>{item.name}</strong>
                <em>{money(item.priceCzk)}</em>
                <small>{item.isTopPlacement ? `TOP ${item.topDays ?? 0} dní` : "bez topování"}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head"><div><h2>Editace balíčků</h2><p>Úprava ceny, délky, topování a aktivace.</p></div></div>
        <div className="package-edit-list">
          {packages.map((item) => (
            <form action={updatePackage} className="package-edit-card" key={item.id}>
              <input name="id" type="hidden" value={item.id} />
              <div className="package-edit-head">
                <span className={`status-pill ${item.isActive ? "status-active" : "status-paused"}`}>{item.isActive ? "Aktivní" : "Skrytý"}</span>
                <strong>{item.name}</strong>
              </div>
              <label className="field-group"><span>Název</span><input className="field" name="name" required defaultValue={item.name} /></label>
              <label className="field-group full"><span>Popis</span><textarea className="textarea textarea-short" name="description" defaultValue={item.description ?? ""} /></label>
              <label className="field-group"><span>Délka</span><input className="field" min="1" name="durationDays" required type="number" defaultValue={item.durationDays} /></label>
              <label className="field-group"><span>Cena</span><input className="field" min="0" name="priceCzk" required type="number" defaultValue={item.priceCzk} /></label>
              <label className="field-group"><span>Barva</span><input className="field" name="highlightColor" defaultValue={item.highlightColor ?? ""} /></label>
              <label className="field-group"><span>Top dní</span><input className="field" min="0" name="topDays" type="number" defaultValue={item.topDays ?? ""} /></label>
              <label className="admin-check full"><input name="isTopPlacement" type="checkbox" defaultChecked={item.isTopPlacement} /> Obsahuje topování</label>
              <button className="button full" type="submit">Uložit změny</button>
              <button className="button secondary full" formAction={togglePackage} type="submit" name="isActive" value={String(item.isActive)}>
                {item.isActive ? "Skrýt balíček" : "Aktivovat balíček"}
              </button>
            </form>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
