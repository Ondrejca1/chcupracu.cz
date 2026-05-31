import { AdPlacementStatus, type Prisma } from "@prisma/client";
import { CalendarDays, ExternalLink, LayoutDashboard, Megaphone, Monitor, PanelRight, Search, Star } from "lucide-react";
import { createAdPlacement, updateAdPlacementStatus } from "@/app/actions";
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

const placementSlots = [
  {
    key: "homepage_strip",
    name: "Homepage reklamní pás",
    location: "Homepage / pod rychlými dlaždicemi",
    format: "Široký banner + text",
    icon: LayoutDashboard,
    publicPath: "/"
  },
  {
    key: "jobs_top_strip",
    name: "Výsledky hledání",
    location: "Hledání práce / nad výsledky",
    format: "Horizontální reklamní pruh",
    icon: Search,
    publicPath: "/jobs"
  },
  {
    key: "sidebar_box",
    name: "Boční promo box",
    location: "Homepage a hledání / boční sloupec",
    format: "Obrázek 4:3 + text",
    icon: PanelRight,
    publicPath: "/jobs"
  },
  {
    key: "job_detail_sidebar",
    name: "Detail inzerátu",
    location: "Detail pracovní nabídky / boční sloupec",
    format: "Karta partnera",
    icon: Monitor,
    publicPath: "/jobs"
  }
];

export default async function AdminAdsPage({ searchParams }: { searchParams: Promise<{ status?: string; slot?: string; q?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const today = new Date();
  const defaultStart = today.toISOString().slice(0, 10);
  const defaultEnd = new Date(today.getTime() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);
  const where: Prisma.AdPlacementWhereInput = {
    ...(params.status && Object.values(AdPlacementStatus).includes(params.status as AdPlacementStatus) ? { status: params.status as AdPlacementStatus } : {}),
    ...(params.slot ? { placementKey: params.slot } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" as const } },
            { clientName: { contains: params.q, mode: "insensitive" as const } },
            { location: { contains: params.q, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  let ads: Awaited<ReturnType<typeof prisma.adPlacement.findMany>> = [];
  let allAdStatuses: { status: AdPlacementStatus }[] = [];

  try {
    [ads, allAdStatuses] = await Promise.all([
      prisma.adPlacement.findMany({ where, orderBy: [{ status: "asc" }, { startsAt: "desc" }, { createdAt: "desc" }] }),
      prisma.adPlacement.findMany({ select: { status: true }, take: 2000 })
    ]);
  } catch (error) {
    console.error("Unable to load ad administration data.", error);
  }

  const countFor = (status: AdPlacementStatus) => allAdStatuses.filter((item) => item.status === status).length;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Obchodní pozice</span>
          <h1>Reklamy</h1>
          <p>Reklamní kampaně napojené na konkrétní pozice na veřejném webu.</p>
        </div>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><span>Aktivní</span><strong>{countFor(AdPlacementStatus.ACTIVE)}</strong><small>zobrazuje se na webu</small></article>
        <article className="admin-stat"><span>Rezervované</span><strong>{countFor(AdPlacementStatus.RESERVED)}</strong><small>čeká na podklady nebo platbu</small></article>
        <article className="admin-stat"><span>Volné</span><strong>{countFor(AdPlacementStatus.AVAILABLE)}</strong><small>pro obchodní nabídku</small></article>
        <article className="admin-stat"><span>Ukončené</span><strong>{countFor(AdPlacementStatus.EXPIRED)}</strong><small>historie kampaní</small></article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Reklamní pozice na webu</h2>
            <p>Každá kampaň se váže na jeden slot. Tím je jasné, kde se zobrazí.</p>
          </div>
        </div>
        <div className="placement-slot-grid">
          {placementSlots.map((slot) => {
            const Icon = slot.icon;
            const activeCount = ads.filter((ad) => ad.placementKey === slot.key && ad.status === AdPlacementStatus.ACTIVE).length;
            return (
              <a className="placement-slot-card" href={slot.publicPath} target="_blank" rel="noreferrer" key={slot.key}>
                <Icon size={22} />
                <strong>{slot.name}</strong>
                <span>{slot.location}</span>
                <small>{slot.format} · {activeCount} aktivní</small>
              </a>
            );
          })}
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Filtry reklam</h2>
            <p>Najděte kampaň podle klienta, slotu nebo stavu.</p>
          </div>
        </div>
        <form className="admin-filter-bar">
          <input className="field" name="q" placeholder="Klient, název nebo pozice" defaultValue={params.q ?? ""} />
          <select className="select" name="slot" defaultValue={params.slot ?? ""}>
            <option value="">Všechny sloty</option>
            {placementSlots.map((slot) => <option key={slot.key} value={slot.key}>{slot.name}</option>)}
          </select>
          <select className="select" name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
          </select>
          <button className="button" type="submit">Filtrovat</button>
        </form>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Nová reklamní kampaň</h2>
              <p>Vyberte slot, obchodní podmínky, klienta a termín.</p>
            </div>
            <Megaphone size={26} />
          </div>
          <form action={createAdPlacement} className="admin-form single">
            <label className="field-group">
              <span>Slot na webu</span>
              <select className="select" name="placementKey" required defaultValue="homepage_strip">
                {placementSlots.map((slot) => <option key={slot.key} value={slot.key}>{slot.name}</option>)}
              </select>
              <small>Určuje, kam se aktivní reklama propíše na veřejném webu.</small>
            </label>
            <label className="field-group">
              <span>Název kampaně</span>
              <input className="field" name="name" placeholder="Partner týdne: firma XY" required />
              <small>Zobrazuje se v adminu a může se propsat jako nadpis reklamy.</small>
            </label>
            <label className="field-group">
              <span>Umístění</span>
              <input className="field" name="location" placeholder="Homepage / horní pás" required />
              <small>Popis pro obchodní tým, kde přesně kampaň běží.</small>
            </label>
            <label className="field-group">
              <span>Formát</span>
              <input className="field" name="format" placeholder="Široký banner + text" required />
              <small>Rozměr, typ kreativy nebo požadavek na podklady.</small>
            </label>
            <label className="field-group">
              <span>Klient</span>
              <input className="field" name="clientName" placeholder="Název firmy" />
              <small>Kdo kampaň objednal nebo platí.</small>
            </label>
            <label className="field-group">
              <span>Kreativa</span>
              <input className="field" name="creativeUrl" placeholder="/ads/banner.jpg nebo URL" />
              <small>Upload budeme řešit později, zatím cesta nebo externí URL.</small>
            </label>
            <label className="field-group">
              <span>Cílový odkaz</span>
              <input className="field" name="targetUrl" placeholder="https://..." type="url" />
              <small>Kam reklama vede po kliknutí.</small>
            </label>
            <label className="field-group">
              <span>Cena</span>
              <input className="field" min="0" name="priceCzk" placeholder="2900" required type="number" />
              <small>Cena za uvedené období.</small>
            </label>
            <label className="field-group">
              <span>Délka kampaně</span>
              <input className="field" min="1" max="365" name="durationDays" required type="number" defaultValue={14} />
              <small>Kolik dní je kampaň objednaná.</small>
            </label>
            <label className="field-group">
              <span>Sloty</span>
              <input className="field" min="0" max="20" name="availableSlots" type="number" defaultValue={1} />
              <small>Kolik souběžných míst je pro tento produkt dostupných.</small>
            </label>
            <label className="field-group">
              <span>Stav</span>
              <select className="select" name="status" defaultValue={AdPlacementStatus.RESERVED}>
                {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
              </select>
              <small>Na web se propisuje jen stav Aktivní.</small>
            </label>
            <label className="field-group">
              <span>Začátek</span>
              <input className="field" name="startsAt" type="date" defaultValue={defaultStart} />
            </label>
            <label className="field-group">
              <span>Konec</span>
              <input className="field" name="endsAt" type="date" defaultValue={defaultEnd} />
              <small>Při změně délky bez ručního konce se datum dopočítá při uložení.</small>
            </label>
            <label className="admin-check full">
              <input name="isFeatured" type="checkbox" /> Zvýraznit na dashboardu
            </label>
            <label className="field-group full">
              <span>Podmínky a poznámka</span>
              <textarea className="textarea" name="note" placeholder="Platební podmínky, dodání podkladů, omezení kampaně." />
            </label>
            <button className="button full" type="submit">Přidat kampaň</button>
          </form>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Aktivní napojení</h2>
              <p>Reklamy, které jsou nebo mohou být vidět na webu.</p>
            </div>
          </div>
          <div className="admin-list">
            {ads.slice(0, 8).map((ad) => (
              <div className="admin-list-row" key={ad.id}>
                <div>
                  <strong>{ad.name}</strong>
                  <span>{placementSlots.find((slot) => slot.key === ad.placementKey)?.name ?? ad.placementKey} · {ad.clientName ?? "bez klienta"} · {money(ad.priceCzk)}</span>
                </div>
                <em>{adStatusLabels[ad.status]}</em>
              </div>
            ))}
            {ads.length === 0 && <p className="admin-empty">Zatím tu není žádná reklamní kampaň.</p>}
          </div>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Přehled kampaní</h2>
            <p>Obchodní stav, termín, klient a rychlá změna stavu.</p>
          </div>
        </div>
        <div className="ad-placement-grid">
          {ads.map((ad) => (
            <article className="ad-placement-card" key={ad.id}>
              <div className="ad-placement-top">
                <span className={`status-pill status-${ad.status.toLowerCase()}`}>{adStatusLabels[ad.status]}</span>
                <span className="status-pill">{placementSlots.find((slot) => slot.key === ad.placementKey)?.name ?? ad.placementKey}</span>
                {ad.isFeatured && <span className="status-pill"><Star size={13} /> Dashboard</span>}
              </div>
              <h3>{ad.name}</h3>
              <p>{ad.note ?? "Bez interní poznámky."}</p>
              <dl>
                <div><dt>Umístění</dt><dd>{ad.location}</dd></div>
                <div><dt>Formát</dt><dd>{ad.format}</dd></div>
                <div><dt>Cena</dt><dd>{money(ad.priceCzk)} / {ad.durationDays} dní</dd></div>
                <div><dt>Klient</dt><dd>{ad.clientName ?? "-"}</dd></div>
                <div><dt>Termín</dt><dd><CalendarDays size={14} /> {ad.startsAt ? dateCs(ad.startsAt) : "-"} až {ad.endsAt ? dateCs(ad.endsAt) : "-"}</dd></div>
                <div><dt>Klik</dt><dd>{ad.targetUrl ? <a href={ad.targetUrl} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Odkaz</a> : "-"}</dd></div>
              </dl>
              <form action={updateAdPlacementStatus} className="ad-status-form">
                <input name="id" type="hidden" value={ad.id} />
                <select className="select" name="status" defaultValue={ad.status}>
                  {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
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
