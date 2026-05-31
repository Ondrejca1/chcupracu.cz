import { AdPlacementStatus } from "@prisma/client";
import { CalendarDays, Megaphone, Newspaper, Star } from "lucide-react";
import { createAdPlacement, createPublicationIssue, setCurrentPublicationIssue, updateAdPlacementStatus } from "@/app/actions";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const adStatusLabels: Record<AdPlacementStatus, string> = {
  AVAILABLE: "Volné",
  RESERVED: "Rezervované",
  ACTIVE: "Aktivní",
  PAUSED: "Pozastavené",
  EXPIRED: "Ukončené"
};

export default async function AdminAdsPage() {
  await requireAdmin();
  let migrationPending = false;
  let issues: Awaited<ReturnType<typeof prisma.publicationIssue.findMany>> = [];
  let ads: Awaited<ReturnType<typeof prisma.adPlacement.findMany>> = [];

  try {
    [issues, ads] = await Promise.all([
      prisma.publicationIssue.findMany({ orderBy: [{ isCurrent: "desc" }, { publishedAt: "desc" }], take: 12 }),
      prisma.adPlacement.findMany({ orderBy: [{ isFeatured: "desc" }, { status: "asc" }, { createdAt: "desc" }] })
    ]);
  } catch (error) {
    migrationPending = true;
    console.error("Unable to load ad administration data.", error);
  }

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Redakční obchod</span>
          <h1>Jalovec a reklamy</h1>
          <p>Správa aktuálního vydání, reklamních ploch, cen, délky kampaní, klientů a stavů.</p>
        </div>
      </div>

      {migrationPending && (
        <div className="notice">
          Reklamní databázové tabulky ještě nejsou nasazené. Spusťte prosím `npm run db:deploy`, potom stránku obnovte.
        </div>
      )}

      <div className="admin-dashboard-grid">
        <section className="admin-card" id="jalovec">
          <div className="admin-card-head">
            <div>
              <h2>Aktuální číslo Jalovce</h2>
              <p>Obálka a odkaz pro promo bloky na veřejném webu.</p>
            </div>
            <Newspaper size={26} />
          </div>
          <form action={createPublicationIssue} className="admin-form">
            <input className="field" name="title" placeholder="Název, např. Aktuální vydání Jalovce" required />
            <input className="field" name="issueNumber" placeholder="Číslo vydání / týden" />
            <input className="field" name="coverImageUrl" placeholder="URL obálky nebo /ads/jalovec-aktualni-vydani.jpg" />
            <input className="field" name="targetUrl" placeholder="Odkaz na vydání / web Jalovce" type="url" />
            <input className="field" min="0" name="priceCzk" placeholder="Cena promo balíčku Kč" type="number" />
            <input className="field" name="publishedAt" type="date" />
            <label className="admin-check">
              <input name="isCurrent" type="checkbox" defaultChecked /> Nastavit jako aktuální vydání
            </label>
            <textarea className="textarea full" name="note" placeholder="Interní poznámka, podmínky, domluva s redakcí" />
            <button className="button full" type="submit">Uložit číslo Jalovce</button>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Vydání v systému</h2>
              <p>Rychlé přepnutí aktuálního čísla.</p>
            </div>
          </div>
          <div className="admin-list">
            {issues.map((issue) => (
              <div className="admin-list-row issue-row" key={issue.id}>
                <div>
                  <strong>{issue.title}</strong>
                  <span>{issue.issueNumber ?? "bez čísla"} · {dateCs(issue.publishedAt)} · {issue.priceCzk ? money(issue.priceCzk) : "bez ceny"}</span>
                </div>
                {issue.isCurrent ? (
                  <em>Aktuální</em>
                ) : (
                  <form action={setCurrentPublicationIssue}>
                    <input name="id" type="hidden" value={issue.id} />
                    <button className="admin-mini-button" type="submit">Nastavit</button>
                  </form>
                )}
              </div>
            ))}
            {issues.length === 0 && <p className="admin-empty">Zatím není uložené žádné vydání.</p>}
          </div>
        </section>
      </div>

      <section className="admin-card" id="reklamy">
        <div className="admin-card-head">
          <div>
            <h2>Nová reklamní pozice</h2>
            <p>Pevně připravené typy pozic můžete dál rozšiřovat podle prodeje.</p>
          </div>
          <Megaphone size={26} />
        </div>
        <form action={createAdPlacement} className="admin-form wide">
          <input className="field" name="name" placeholder="Název pozice / kampaně" required />
          <input className="field" name="location" placeholder="Umístění, např. Homepage horní pás" required />
          <input className="field" name="format" placeholder="Formát, např. 1200×260 banner" required />
          <input className="field" name="clientName" placeholder="Klient / firma" />
          <input className="field" name="creativeUrl" placeholder="URL kreativy / obrázku nebo /ads/..." />
          <input className="field" name="targetUrl" placeholder="Cílový odkaz" type="url" />
          <input className="field" min="0" name="priceCzk" placeholder="Cena Kč" required type="number" />
          <input className="field" min="1" max="365" name="durationDays" placeholder="Délka kampaně ve dnech" required type="number" defaultValue={14} />
          <input className="field" min="0" max="20" name="availableSlots" placeholder="Počet slotů" type="number" defaultValue={1} />
          <select className="select" name="status" defaultValue={AdPlacementStatus.AVAILABLE}>
            {Object.values(AdPlacementStatus).map((status) => (
              <option key={status} value={status}>{adStatusLabels[status]}</option>
            ))}
          </select>
          <input className="field" name="startsAt" type="date" />
          <input className="field" name="endsAt" type="date" />
          <label className="admin-check">
            <input name="isFeatured" type="checkbox" /> Zobrazit na dashboardu jako důležitou pozici
          </label>
          <textarea className="textarea full" name="note" placeholder="Podmínky, dodání podkladů, fakturace, omezení kampaně" />
          <button className="button full" type="submit">Přidat reklamní pozici</button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Přehled reklamních ploch</h2>
            <p>Ceny, termíny, obsazenost a stav kampaní.</p>
          </div>
        </div>
        <div className="ad-placement-grid">
          {ads.map((ad) => (
            <article className="ad-placement-card" key={ad.id}>
              <div className="ad-placement-top">
                <span className={`status-pill status-${ad.status.toLowerCase()}`}>{adStatusLabels[ad.status]}</span>
                {ad.isFeatured && <span className="status-pill"><Star size={13} /> Dashboard</span>}
              </div>
              <h3>{ad.name}</h3>
              <p>{ad.note ?? "Bez interní poznámky."}</p>
              <dl>
                <div><dt>Umístění</dt><dd>{ad.location}</dd></div>
                <div><dt>Formát</dt><dd>{ad.format}</dd></div>
                <div><dt>Cena</dt><dd>{money(ad.priceCzk)} / {ad.durationDays} dní</dd></div>
                <div><dt>Sloty</dt><dd>{ad.availableSlots}</dd></div>
                <div><dt>Klient</dt><dd>{ad.clientName ?? "-"}</dd></div>
                <div><dt>Termín</dt><dd><CalendarDays size={14} /> {ad.startsAt ? dateCs(ad.startsAt) : "-"} až {ad.endsAt ? dateCs(ad.endsAt) : "-"}</dd></div>
              </dl>
              <form action={updateAdPlacementStatus} className="ad-status-form">
                <input name="id" type="hidden" value={ad.id} />
                <select className="select" name="status" defaultValue={ad.status}>
                  {Object.values(AdPlacementStatus).map((status) => (
                    <option key={status} value={status}>{adStatusLabels[status]}</option>
                  ))}
                </select>
                <button className="button secondary" type="submit">Změnit stav</button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
