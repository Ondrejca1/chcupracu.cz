import Link from "next/link";
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Megaphone, ReceiptText } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { dateCs, money } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";
import { getOperationalWarnings } from "@/lib/admin-insights";
import { adStatusLabels, jobStatusLabels } from "@/lib/business-rules";

export default async function AdminTasksPage() {
  await requireAdmin();
  const warnings = await getOperationalWarnings();
  const total =
    warnings.counts.expiringJobs +
    warnings.counts.activeWithoutInvoice +
    warnings.counts.paidButInactive +
    warnings.counts.adsWithoutCreative;

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Operační jistota</span>
          <h1>Úkoly redakce</h1>
          <p>Kontrola věcí, které mohou způsobit špatné obchodní propsání mezi adminem a veřejným webem.</p>
        </div>
        <Link className="button secondary" href="/admin/dashboard">
          Zpět na dashboard
        </Link>
      </div>

      <section className="admin-stat-grid compact">
        <article className="admin-stat"><AlertTriangle size={22} /><span>Otevřené úkoly</span><strong>{total}</strong><small>součet kontrol níže</small></article>
        <article className="admin-stat"><BriefcaseBusiness size={22} /><span>Končící nabídky</span><strong>{warnings.counts.expiringJobs}</strong><small>do 7 dní</small></article>
        <article className="admin-stat"><ReceiptText size={22} /><span>Finance</span><strong>{warnings.counts.activeWithoutInvoice + warnings.counts.paidButInactive}</strong><small>faktury vs. publikace</small></article>
        <article className="admin-stat"><Megaphone size={22} /><span>Reklamy</span><strong>{warnings.counts.adsWithoutCreative}</strong><small>chybějící kreativa</small></article>
      </section>

      {total === 0 && (
        <section className="admin-card success-card">
          <CheckCircle2 size={24} />
          <div>
            <h2>Všechno vypadá v pořádku</h2>
            <p>Nejsou tu končící nabídky, fakturační rozpory ani aktivní reklamy bez kreativy.</p>
          </div>
        </section>
      )}

      <section className="admin-dashboard-grid">
        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Končí do 7 dní</h2>
              <p>Nabídky, které je vhodné obnovit, ukončit nebo před prodejem zkontrolovat.</p>
            </div>
          </div>
          <div className="admin-list">
            {warnings.expiringJobs.map((job) => (
              <Link className="admin-list-row" href={`/admin/jobs/${job.id}/edit`} key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.company.name}</span>
                </div>
                <em>{dateCs(job.activeUntil)}</em>
              </Link>
            ))}
            {warnings.expiringJobs.length === 0 && <p className="admin-empty">Žádný inzerát nekončí v příštích 7 dnech.</p>}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Aktivní bez faktury</h2>
              <p>Veřejně zobrazené nabídky bez navázané faktury nebo balíčku ve financích.</p>
            </div>
          </div>
          <div className="admin-list">
            {warnings.activeWithoutInvoice.map((job) => (
              <Link className="admin-list-row" href={`/admin/jobs/${job.id}/edit`} key={job.id}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.company.name}</span>
                </div>
                <em>bez faktury</em>
              </Link>
            ))}
            {warnings.activeWithoutInvoice.length === 0 && <p className="admin-empty">Aktivní nabídky mají fakturační stopu.</p>}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Zaplaceno, ale neaktivní</h2>
              <p>Faktury jsou uhrazené, ale nabídka není viditelná na webu.</p>
            </div>
          </div>
          <div className="admin-list">
            {warnings.paidButInactive.map((invoice) => (
              <Link className="admin-list-row" href={invoice.job ? `/admin/jobs/${invoice.job.id}/edit` : "/admin/finance"} key={invoice.id}>
                <div>
                  <strong>{invoice.job?.title ?? "Faktura bez inzerátu"}</strong>
                  <span>{invoice.company.name} · {invoice.job ? jobStatusLabels[invoice.job.status] : "bez vazby"}</span>
                </div>
                <em>{money(invoice.amountCzk)}</em>
              </Link>
            ))}
            {warnings.paidButInactive.length === 0 && <p className="admin-empty">Zaplacené inzeráty jsou aktivní nebo nemají problém v publikaci.</p>}
          </div>
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Reklamy bez kreativy</h2>
              <p>Rezervované nebo aktivní kampaně, kde chybí obrázek nebo banner.</p>
            </div>
          </div>
          <div className="admin-list">
            {warnings.adsWithoutCreative.map((ad) => (
              <Link className="admin-list-row" href={`/admin/ads?slot=${ad.placementKey}#new-ad`} key={ad.id}>
                <div>
                  <strong>{ad.name}</strong>
                  <span>{ad.clientName ?? "bez klienta"} · {ad.placementKey}</span>
                </div>
                <em>{adStatusLabels[ad.status]}</em>
              </Link>
            ))}
            {warnings.adsWithoutCreative.length === 0 && <p className="admin-empty">Všechny běžící/rezervované reklamy mají kreativu.</p>}
          </div>
        </article>
      </section>
    </AdminShell>
  );
}
