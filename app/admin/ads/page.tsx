import Link from "next/link";
import { AdPlacementStatus, AdProductType, type Prisma } from "@prisma/client";
import { CalendarDays, Edit3, ExternalLink, Eye, LayoutDashboard, Megaphone, Monitor, PanelRight, Search, ShieldOff, SquarePen, Star } from "lucide-react";
import { createAdPlacement, endAdPlacementNow, updateAdPlacement, updateAdPlacementStatus } from "@/lib/actions/ads";
import { AdminShell } from "@/components/AdminShell";
import { AdSlotSelect } from "@/components/AdSlotSelect";
import { AssetUploadField } from "@/components/AssetUploadField";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { adSlotDefinitions } from "@/lib/ad-slots";
import { dateCs, money } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adStatusLabels, syncExpiredBusinessState } from "@/lib/business-rules";

const adProductTypeLabels: Record<AdProductType, string> = {
  PAID_AD: "Placená reklama",
  JALOVEC: "Jalovec",
  PARTNER_OF_WEEK: "Partner týdne"
};

const slotIcons: Record<string, typeof LayoutDashboard> = {
  homepage_strip: LayoutDashboard,
  jobs_top_strip: Search,
  sidebar_box: PanelRight,
  job_detail_sidebar: Monitor
};

function daysUntil(date?: Date | null) {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

function dateInput(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function slotFor(key: string) {
  return adSlotDefinitions.find((slot) => slot.key === key) ?? adSlotDefinitions[0];
}

export default async function AdminAdsPage({ searchParams }: { searchParams: Promise<{ status?: string; slot?: string; q?: string; error?: string; notice?: string }> }) {
  await requirePermission("ads:write");
  await syncExpiredBusinessState();
  const params = await searchParams;
  const today = new Date();
  const selectedSlot = slotFor(params.slot ?? adSlotDefinitions[0].key);
  const selectedSlotKey = adSlotDefinitions.some((slot) => slot.key === params.slot) ? params.slot : undefined;
  const where: Prisma.AdPlacementWhereInput = {
    ...(params.status && Object.values(AdPlacementStatus).includes(params.status as AdPlacementStatus) ? { status: params.status as AdPlacementStatus } : {}),
    ...(selectedSlotKey ? { placementKey: selectedSlotKey } : {}),
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
  let statusCounts: Array<{ status: AdPlacementStatus; _count: { _all: number } }> = [];
  let slotMetrics: { status: AdPlacementStatus; placementKey: string; startsAt: Date | null; endsAt: Date | null }[] = [];
  let missingCreative = 0;

  try {
    [ads, statusCounts, slotMetrics, missingCreative] = await Promise.all([
      prisma.adPlacement.findMany({ where, orderBy: [{ status: "asc" }, { startsAt: "desc" }, { createdAt: "desc" }], take: 120 }),
      prisma.adPlacement.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.adPlacement.findMany({
        where: { status: { in: [AdPlacementStatus.ACTIVE, AdPlacementStatus.RESERVED] } },
        select: { status: true, placementKey: true, startsAt: true, endsAt: true },
        take: 500
      }),
      prisma.adPlacement.count({
        where: {
          status: { in: [AdPlacementStatus.ACTIVE, AdPlacementStatus.RESERVED] },
          creativeUrl: null
        }
      })
    ]);
  } catch (error) {
    console.error("Unable to load ad administration data.", error);
  }

  const countFor = (status: AdPlacementStatus) => statusCounts.find((item) => item.status === status)?._count._all ?? 0;
  const isLive = (ad: { status: AdPlacementStatus; startsAt: Date | null; endsAt: Date | null }) =>
    ad.status === AdPlacementStatus.ACTIVE && (!ad.startsAt || ad.startsAt <= today) && (!ad.endsAt || ad.endsAt >= today);
  const liveAds = ads.filter(isLive);

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Reklamní inventory</span>
          <h1>Reklamy</h1>
          <p>Přehled obsazenosti pozic, termínů, kreativ a obchodních kampaní napojených na veřejný web.</p>
        </div>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><span>Aktivní</span><strong>{countFor(AdPlacementStatus.ACTIVE)}</strong><small>zobrazuje se na webu</small></article>
        <article className="admin-stat"><span>Rezervované</span><strong>{countFor(AdPlacementStatus.RESERVED)}</strong><small>čeká na podklady nebo platbu</small></article>
        <article className="admin-stat"><span>Bez kreativy</span><strong>{missingCreative}</strong><small>aktivní nebo rezervované bez obrázku</small></article>
        <article className="admin-stat"><span>Ukončené</span><strong>{countFor(AdPlacementStatus.EXPIRED)}</strong><small>historie kampaní</small></article>
      </section>

      <section className="ads-inventory-board">
        <div className="jobs-board-head">
          <div>
            <span className="admin-kicker">Pozice na webu</span>
            <h2>Obsazenost slotů</h2>
          </div>
          <span>{adSlotDefinitions.length} pozice</span>
        </div>
        <div className="placement-slot-grid">
          {adSlotDefinitions.map((slot) => {
            const Icon = slotIcons[slot.key] ?? Megaphone;
            const slotAds = slotMetrics.filter((ad) => ad.placementKey === slot.key);
            const activeCount = slotAds.filter(isLive).length;
            const reservedCount = slotAds.filter((ad) => ad.status === AdPlacementStatus.RESERVED).length;
            const isSelected = selectedSlot.key === slot.key;
            return (
              <Link className={`placement-slot-card ${isSelected ? "active" : ""}`} href={`/admin/ads?slot=${slot.key}#new-ad`} key={slot.key}>
                <Icon size={22} />
                <strong>{slot.name}</strong>
                <span>{slot.location}</span>
                <small>{slot.format} · {slot.recommendedSize}</small>
                <em>{activeCount}/{slot.availableSlots} aktivní · {reservedCount} rezervace</em>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="jobs-command-panel">
        <form className="jobs-filter-grid">
          <label>
            <Search size={16} />
            <input name="q" placeholder="Klient, název nebo pozice" defaultValue={params.q ?? ""} />
          </label>
          <select name="slot" defaultValue={params.slot ?? ""}>
            <option value="">Všechny pozice</option>
            {adSlotDefinitions.map((slot) => <option key={slot.key} value={slot.key}>{slot.name}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">Všechny stavy</option>
            {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
          </select>
          <button className="button" type="submit">Filtrovat</button>
          <Link className="button secondary" href="/admin/ads">Vyčistit</Link>
        </form>
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-card" id="new-ad">
          <div className="admin-card-head">
            <div>
              <h2>Nová reklamní kampaň</h2>
              <p>Vyberte pozici. Umístění, formát, doporučený rozměr a výchozí cena se doplní automaticky.</p>
            </div>
            <Megaphone size={26} />
          </div>
          <form action={createAdPlacement} className="admin-form single">
            <AdSlotSelect defaultValue={selectedSlot.key} slots={adSlotDefinitions} />
            <label className="field-group">
              <span>Typ kampaně</span>
              <select className="select" name="productType" defaultValue={selectedSlot.productType}>
                {Object.values(AdProductType).map((type) => <option key={type} value={type}>{adProductTypeLabels[type]}</option>)}
              </select>
            </label>
            <label className="field-group">
              <span>Název kampaně</span>
              <input className="field" name="name" placeholder="Partner týdne: firma XY" required />
            </label>
            <label className="field-group">
              <span>Klient</span>
              <input className="field" name="clientName" placeholder="Název firmy" />
            </label>
            <AssetUploadField
              accept="image/jpeg,image/png,image/webp,image/gif"
              help="Nahrajte obrázek nebo ponechte externí URL."
              label="Kreativa"
              name="creativeUrl"
              placeholder="/uploads/admin/banner.jpg nebo URL"
            />
            <label className="field-group">
              <span>Cílový odkaz</span>
              <input className="field" name="targetUrl" placeholder="https://..." type="url" />
            </label>
            <div className="content-two-col">
              <label className="field-group">
                <span>Cena</span>
                <input className="field" min="0" name="priceCzk" placeholder={String(selectedSlot.defaultPriceCzk)} type="number" />
              </label>
              <label className="field-group">
                <span>Délka kampaně</span>
                <input className="field" min="1" max="365" name="durationDays" type="number" defaultValue={selectedSlot.defaultDurationDays} />
              </label>
            </div>
            <div className="content-two-col">
              <label className="field-group">
                <span>Začátek</span>
                <input className="field" name="startsAt" type="date" defaultValue={today.toISOString().slice(0, 10)} />
              </label>
              <label className="field-group">
                <span>Konec</span>
                <input className="field" name="endsAt" type="date" defaultValue={new Date(today.getTime() + selectedSlot.defaultDurationDays * 86_400_000).toISOString().slice(0, 10)} />
              </label>
            </div>
            <label className="field-group">
              <span>Stav</span>
              <select className="select" name="status" defaultValue={AdPlacementStatus.RESERVED}>
                {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
              </select>
            </label>
            <input name="availableSlots" type="hidden" value={selectedSlot.availableSlots} />
            <label className="admin-check full">
              <input name="isFeatured" type="checkbox" /> Zvýraznit na dashboardu
            </label>
            <label className="field-group full">
              <span>Interní poznámka</span>
              <textarea className="textarea" name="note" placeholder="Platební podmínky, dodání podkladů, omezení kampaně." />
            </label>
            <button className="button full" type="submit">Přidat kampaň</button>
          </form>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Aktuálně na webu</h2>
              <p>Kampaně, které jsou aktivní v platném termínu.</p>
            </div>
          </div>
          <div className="admin-list">
            {liveAds.slice(0, 8).map((ad) => (
              <div className="admin-list-row" key={ad.id}>
                <div>
                  <strong>{ad.name}</strong>
                  <span>{slotFor(ad.placementKey).name} · do {dateCs(ad.endsAt)} · {ad.clientName ?? "bez klienta"}</span>
                </div>
                <em>{money(ad.priceCzk)}</em>
              </div>
            ))}
            {liveAds.length === 0 && <p className="admin-empty">Žádná filtrovaná kampaň teď neběží.</p>}
          </div>
        </article>
      </section>

      <section className="jobs-board">
        <div className="jobs-board-head">
          <div>
            <span className="admin-kicker">Přehled kampaní</span>
            <h2>Termíny, kreativy a akce</h2>
          </div>
          <span>{ads.length} položek</span>
        </div>
        <div className="ad-ops-list">
          {ads.map((ad) => {
            const slot = slotFor(ad.placementKey);
            const remaining = daysUntil(ad.endsAt);
            return (
              <article className="ad-ops-card" key={ad.id}>
                <header className="ad-ops-title">
                  <div>
                    <span className={`status-pill status-${ad.status.toLowerCase()}`}>{adStatusLabels[ad.status]}</span>
                    <span className="status-pill">{slot.name}</span>
                    <span className="status-pill">{adProductTypeLabels[ad.productType]}</span>
                    {!ad.creativeUrl && <span className="status-pill status-waiting">Bez kreativy</span>}
                    <h3>{ad.name}</h3>
                    <p>{ad.clientName ?? "Bez klienta"} · {slot.location}</p>
                  </div>
                  <div className="jobs-action-strip">
                    {ad.targetUrl && <Link className="job-action-icon" href={ad.targetUrl} target="_blank" title="Otevřít cílový odkaz"><ExternalLink size={18} /></Link>}
                    <form action={endAdPlacementNow}>
                      <input name="id" type="hidden" value={ad.id} />
                      <ConfirmSubmitButton className="job-action-icon danger" message={`Opravdu ukončit reklamu „${ad.name}“ hned dnes?`}>
                        <ShieldOff size={18} />
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </header>

                <div className="jobs-ops-sections">
                  <section>
                    <span><CalendarDays size={15} /> Termín</span>
                    <strong>{dateCs(ad.startsAt)} → {dateCs(ad.endsAt)}</strong>
                    <small>{remaining == null ? "bez konce" : remaining >= 0 ? `zbývá ${remaining} dní` : "po termínu"}</small>
                  </section>
                  <section>
                    <span><Megaphone size={15} /> Pozice</span>
                    <strong>{slot.format}</strong>
                    <small>{slot.recommendedSize} · {ad.availableSlots} slotů</small>
                  </section>
                  <section>
                    <span><Star size={15} /> Obchod</span>
                    <strong>{money(ad.priceCzk)} / {ad.durationDays} dní</strong>
                    <small>{ad.isFeatured ? "zvýrazněno na dashboardu" : "standardní evidence"}</small>
                  </section>
                  <section>
                    <span><Eye size={15} /> Kreativa</span>
                    <strong>{ad.creativeUrl ? "Nahraná" : "Chybí"}</strong>
                    <small>{ad.targetUrl ? "má cílový odkaz" : "bez cílového odkazu"}</small>
                  </section>
                </div>

                <details className="ad-edit-panel">
                  <summary><SquarePen size={16} /> Upravit kampaň</summary>
                  <form action={updateAdPlacement} className="admin-form wide">
                    <input name="id" type="hidden" value={ad.id} />
                    <AdSlotSelect defaultValue={ad.placementKey} slots={adSlotDefinitions} />
                    <label className="field-group">
                      <span>Název</span>
                      <input className="field" name="name" required defaultValue={ad.name} />
                    </label>
                    <label className="field-group">
                      <span>Klient</span>
                      <input className="field" name="clientName" defaultValue={ad.clientName ?? ""} />
                    </label>
                    <label className="field-group">
                      <span>Typ kampaně</span>
                      <select className="select" name="productType" defaultValue={ad.productType}>
                        {Object.values(AdProductType).map((type) => <option key={type} value={type}>{adProductTypeLabels[type]}</option>)}
                      </select>
                    </label>
                    <label className="field-group">
                      <span>Stav</span>
                      <select className="select" name="status" defaultValue={ad.status}>
                        {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
                      </select>
                    </label>
                    <AssetUploadField
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      defaultValue={ad.creativeUrl}
                      help="Nahrajte obrázek nebo ponechte externí URL."
                      label="Kreativa"
                      name="creativeUrl"
                      placeholder="/uploads/admin/banner.jpg nebo URL"
                    />
                    <label className="field-group">
                      <span>Cílový odkaz</span>
                      <input className="field" name="targetUrl" type="url" defaultValue={ad.targetUrl ?? ""} />
                    </label>
                    <label className="field-group">
                      <span>Cena</span>
                      <input className="field" min="0" name="priceCzk" type="number" defaultValue={ad.priceCzk} />
                    </label>
                    <label className="field-group">
                      <span>Délka</span>
                      <input className="field" min="1" max="365" name="durationDays" type="number" defaultValue={ad.durationDays} />
                    </label>
                    <label className="field-group">
                      <span>Začátek</span>
                      <input className="field" name="startsAt" type="date" defaultValue={dateInput(ad.startsAt)} />
                    </label>
                    <label className="field-group">
                      <span>Konec</span>
                      <input className="field" name="endsAt" type="date" defaultValue={dateInput(ad.endsAt)} />
                    </label>
                    <input name="availableSlots" type="hidden" value={slot.availableSlots} />
                    <label className="admin-check">
                      <input name="isFeatured" type="checkbox" defaultChecked={ad.isFeatured} /> Dashboard
                    </label>
                    <label className="field-group full">
                      <span>Poznámka</span>
                      <textarea className="textarea" name="note" defaultValue={ad.note ?? ""} />
                    </label>
                    <button className="button full" type="submit"><Edit3 size={16} /> Uložit změny</button>
                  </form>
                </details>

                <form action={updateAdPlacementStatus} className="ad-status-form">
                  <input name="id" type="hidden" value={ad.id} />
                  <select className="select" name="status" defaultValue={ad.status}>
                    {Object.values(AdPlacementStatus).map((status) => <option key={status} value={status}>{adStatusLabels[status]}</option>)}
                  </select>
                  <button className="button secondary" type="submit">Rychle změnit stav</button>
                </form>
              </article>
            );
          })}
          {ads.length === 0 && <p className="admin-empty">Pro vybrané filtry tu není žádná reklamní kampaň.</p>}
        </div>
      </section>
    </AdminShell>
  );
}
