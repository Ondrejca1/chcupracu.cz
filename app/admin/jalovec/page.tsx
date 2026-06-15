import { BookOpen, CheckCircle2, ExternalLink, Newspaper } from "lucide-react";
import { createPublicationIssue, setCurrentPublicationIssue } from "@/lib/actions/publication";
import { AdminShell } from "@/components/AdminShell";
import { AssetUploadField } from "@/components/AssetUploadField";
import { SmartImage } from "@/components/SmartImage";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { dateCs, money } from "@/lib/format";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type JalovecIssue = {
  id: string;
  title: string;
  issueNumber: string | null;
  publishedAt: Date;
  coverImageUrl: string;
  targetUrl: string | null;
  priceCzk: number | null;
  isCurrent: boolean;
  note: string | null;
};

const noticeMessages: Record<string, string> = {
  created: "Vydání bylo uložené do archivu.",
  "created-current": "Vydání bylo uložené a nastavené jako aktuální pro web.",
  "created-not-current": "Vydání bylo uložené, ale nepodařilo se ho nastavit jako aktuální. Zkuste ho přepnout v archivu níže.",
  current: "Aktuální vydání pro web bylo změněné."
};

const errorMessages: Record<string, string> = {
  create: "Vydání se nepodařilo uložit do databáze. Pravděpodobně chybí produkční migrace pro Jalovec/Reklamy.",
  current: "Vydání se nepodařilo nastavit jako aktuální.",
  date: "Datum vydání není platné.",
  invalid: "Formulář není vyplněný správně."
};

export default async function AdminJalovecPage({ searchParams }: { searchParams: Promise<{ notice?: string; error?: string }> }) {
  await requirePermission("jalovec:write");
  const params = await searchParams;
  let issues: JalovecIssue[] = [];

  try {
    issues = await prisma.publicationIssue.findMany({
      orderBy: [{ isCurrent: "desc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        title: true,
        issueNumber: true,
        publishedAt: true,
        coverImageUrl: true,
        targetUrl: true,
        priceCzk: true,
        isCurrent: true,
        note: true
      },
      take: 24
    });
  } catch (error) {
    console.error("Unable to load Jalovec issues.", error);
  }

  const currentIssue = issues.find((issue) => issue.isCurrent);

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Redakční obsah</span>
          <h1>Jalovec</h1>
          <p>Aktuální čísla, obálky a promo odkazy pro reklamní bloky na webu.</p>
        </div>
      </div>
      {params.notice && noticeMessages[params.notice] && <p className="notice">{noticeMessages[params.notice]}</p>}
      {params.error && errorMessages[params.error] && <p className="notice error">{errorMessages[params.error]}</p>}

      <section className="admin-dashboard-grid">
        <article className="admin-card jalovec-current">
          <div className="admin-card-head">
            <div>
              <h2>Aktuálně na webu</h2>
              <p>Toto vydání se propisuje do promo bloků na homepage a ve výsledcích hledání.</p>
            </div>
            <Newspaper size={28} />
          </div>
          {currentIssue ? (
            <div className="jalovec-preview">
              <SmartImage alt={currentIssue.title} className="jalovec-preview-image" sizes="(max-width: 860px) 100vw, 320px" src={currentIssue.coverImageUrl || "/ads/jalovec-aktualni-vydani.jpg"} />
              <div>
                <span className="status-pill status-active"><CheckCircle2 size={14} /> Aktivní</span>
                <h3>{currentIssue.title}</h3>
                <p>{currentIssue.note ?? "Bez interní poznámky."}</p>
                <div className="meta">
                  <span>{currentIssue.issueNumber ?? "bez čísla"}</span>
                  <span>{dateCs(currentIssue.publishedAt)}</span>
                  <span>{currentIssue.priceCzk ? money(currentIssue.priceCzk) : "bez ceny"}</span>
                </div>
                {currentIssue.targetUrl && (
                  <a className="admin-icon-link" href={currentIssue.targetUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} /> Otevřít odkaz
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="admin-empty">Aktuální vydání ještě není nastavené.</p>
          )}
        </article>

        <article className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2>Přidat vydání</h2>
              <p>Vyplňte obálku a odkaz. Obrázek může být lokální `/ads/...` nebo externí URL.</p>
            </div>
            <BookOpen size={28} />
          </div>
          <form action={createPublicationIssue} className="admin-form single">
            <label className="field-group">
              <span>Název vydání</span>
              <input className="field" name="title" placeholder="Aktuální vydání Jalovce" required />
              <small>Zobrazí se jako titulek reklamního bloku.</small>
            </label>
            <label className="field-group">
              <span>Číslo / týden</span>
              <input className="field" name="issueNumber" placeholder="např. 23/2026" />
              <small>Interní orientace pro redakci.</small>
            </label>
            <AssetUploadField
              accept="image/jpeg,image/png,image/webp,image/gif"
              help="Obálku můžete nahrát přímo, případně ponechat externí URL."
              label="Obálka"
              name="coverImageUrl"
              placeholder="/uploads/admin/jalovec.jpg nebo URL"
            />
            <label className="field-group">
              <span>Cílový odkaz</span>
              <input className="field" name="targetUrl" placeholder="https://www.jalovec.cz" type="url" />
              <small>Kam se návštěvník dostane po kliknutí.</small>
            </label>
            <label className="field-group">
              <span>Cena / hodnota promo balíčku</span>
              <input className="field" min="0" name="priceCzk" placeholder="0" type="number" />
              <small>Nepovinné, použitelné pro obchodní přehled.</small>
            </label>
            <label className="field-group">
              <span>Datum vydání</span>
              <input className="field" name="publishedAt" type="date" />
              <small>Podle toho se řadí archiv.</small>
            </label>
            <label className="admin-check full">
              <input name="isCurrent" type="checkbox" defaultChecked /> Nastavit jako aktuální vydání
            </label>
            <label className="field-group full">
              <span>Poznámka / text promo bloku</span>
              <textarea className="textarea" name="note" placeholder="Krátký text, který se může zobrazit u promo bloku." />
            </label>
            <button className="button full" type="submit">Uložit vydání</button>
          </form>
        </article>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2>Archiv vydání</h2>
            <p>Přepnutí aktuálního čísla bez mazání historie.</p>
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
                  <ConfirmSubmitButton className="admin-mini-button" message={`Nastavit „${issue.title}“ jako aktuální vydání na webu?`}>
                    Nastavit jako aktuální
                  </ConfirmSubmitButton>
                </form>
              )}
            </div>
          ))}
          {issues.length === 0 && <p className="admin-empty">Zatím není uložené žádné vydání.</p>}
        </div>
      </section>
    </AdminShell>
  );
}
