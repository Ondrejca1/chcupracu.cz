import { createDictionaryItem, updateDictionaryItem } from "@/lib/actions/dictionaries";
import { AdminShell } from "@/components/AdminShell";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const dictionaryLabels = {
  city: "Města",
  category: "Obory",
  education: "Vzdělání",
  employmentType: "Úvazky",
  suitability: "Vhodné pro"
} as const;

export default async function AdminDictionariesPage() {
  await requirePermission("dictionaries:write");
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
                <form action={updateDictionaryItem} className="dictionary-edit-row" key={item.id}>
                  <input name="type" type="hidden" value={group.type} />
                  <input name="id" type="hidden" value={item.id} />
                  <label className="field-group">
                    <span>Název</span>
                    <input className="field" name="name" defaultValue={item.name} required />
                  </label>
                  {group.type === "city" && (
                    <label className="field-group">
                      <span>Region</span>
                      <input className="field" name="region" defaultValue={"region" in item ? item.region ?? "" : ""} />
                    </label>
                  )}
                  <label className="field-group compact-field">
                    <span>Pořadí</span>
                    <input className="field" name="sortOrder" type="number" min="0" max="9999" defaultValue={item.sortOrder} />
                  </label>
                  <label className="admin-check dictionary-active">
                    <input name="isActive" type="checkbox" defaultChecked={item.isActive} /> Aktivní
                  </label>
                  <button className="admin-mini-button" type="submit">Uložit</button>
                  <small className="dictionary-slug">{item.slug}</small>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminShell>
  );
}
