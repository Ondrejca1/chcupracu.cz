import { createDictionaryItem, toggleDictionaryItem } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dictionaryLabels = {
  city: "Města",
  category: "Obory",
  education: "Vzdělání",
  employmentType: "Úvazky",
  suitability: "Vhodné pro"
} as const;

export default async function AdminDictionariesPage() {
  await requireAdmin();
  const [cities, categories, educations, employmentTypes, suitabilities] = await Promise.all([
    prisma.city.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.education.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.employmentType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.suitability.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ]);
  const groups = [
    { type: "city", items: cities },
    { type: "category", items: categories },
    { type: "education", items: educations },
    { type: "employmentType", items: employmentTypes },
    { type: "suitability", items: suitabilities }
  ] as const;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Datové číselníky</span>
          <h1>Města a číselníky</h1>
          <p>Správa filtrů, které používá veřejný web i redakční editor inzerátů.</p>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-head"><div><h2>Přidat položku</h2><p>Nové město, obor, vzdělání, úvazek nebo segment vhodnosti.</p></div></div>
        <form action={createDictionaryItem} className="admin-filter-bar">
          <select className="select" name="type" defaultValue="city">
            {Object.entries(dictionaryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <input className="field" name="name" placeholder="Název položky" required />
          <input className="field" name="region" placeholder="Region pouze pro město" />
          <input className="field" name="sortOrder" placeholder="Pořadí" type="number" defaultValue={100} />
          <button className="button" type="submit">Přidat / obnovit</button>
        </form>
      </section>

      <div className="dictionary-grid">
        {groups.map((group) => (
          <section className="admin-card" key={group.type}>
            <div className="admin-card-head">
              <div>
                <h2>{dictionaryLabels[group.type]}</h2>
                <p>{group.items.filter((item) => item.isActive).length} aktivních z {group.items.length}</p>
              </div>
            </div>
            <div className="admin-list compact">
              {group.items.map((item) => (
                <form action={toggleDictionaryItem} className="admin-list-row" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.slug} · pořadí {item.sortOrder}{group.type === "city" && "region" in item && item.region ? ` · ${item.region}` : ""}</span>
                  </div>
                  <input name="type" type="hidden" value={group.type} />
                  <input name="id" type="hidden" value={item.id} />
                  <input name="isActive" type="hidden" value={String(item.isActive)} />
                  <button className="admin-mini-button" type="submit">{item.isActive ? "Skrýt" : "Aktivovat"}</button>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
