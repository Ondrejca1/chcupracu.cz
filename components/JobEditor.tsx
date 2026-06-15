import { CalendarClock, Eye, FileText, ImageIcon, Settings2, Sparkles } from "lucide-react";
import { JobStatus } from "@prisma/client";
import { upsertJob } from "@/lib/actions/jobs";
import { AssetUploadField } from "@/components/AssetUploadField";
import type { getFilters } from "@/lib/queries";

type Filters = Awaited<ReturnType<typeof getFilters>>;
type EditableJob = {
  id: string;
  title: string;
  company: { name: string; logoUrl?: string | null; brandColor?: string | null };
  cityId: string;
  categoryId: string;
  educationId: string | null;
  employmentTypeId: string;
  packageId: string | null;
  shortIntro: string;
  description: string;
  requirements: string | null;
  benefits: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  previewImageUrl: string | null;
  detailImageUrl: string | null;
  flyerUrl: string | null;
  showImageInList: boolean;
  showSalaryInPreview: boolean;
  showOnHomepage: boolean;
  salaryMinCzk: number | null;
  salaryMaxCzk: number | null;
  highlightColor: string | null;
  status: JobStatus;
  activeFrom: Date | null;
  activeUntil: Date | null;
  renewedAt: Date | null;
  createdAt: Date;
  topUntil: Date | null;
  isTop: boolean;
  suitabilities: { suitabilityId: string }[];
};

const dateTimeInput = (date?: Date | null) => {
  if (!date) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export function JobEditor({
  filters,
  packages,
  job
}: {
  filters: Filters;
  packages: { id: string; name: string; durationDays: number; isTopPlacement: boolean; topDays: number | null }[];
  job?: EditableJob;
}) {
  const selectedSuitabilities = new Set(job?.suitabilities.map((item) => item.suitabilityId) ?? []);
  const remainingDays = (date?: Date | null) => {
    if (!date) return 30;
    const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
    return Math.max(days, 1);
  };
  const remainingTopDays = job?.isTop ? remainingDays(job.topUntil) : 0;

  return (
    <form
      action={async (formData) => {
        "use server";
        await upsertJob(formData);
      }}
      className="job-editor-modern"
    >
      <div className="admin-card job-editor-hero">
        <div>
          <span className="admin-kicker">Pracovní nabídka</span>
          <h2>{job ? "Upravit inzerát" : "Nový inzerát"}</h2>
          <p>Inzerát je rozdělený do provozních bloků: obsah, publikace, média, kontakt a zobrazení.</p>
        </div>
        {job && <input name="id" type="hidden" value={job.id} />}
        <button className="button" type="submit">Uložit inzerát</button>
      </div>

      <nav className="job-editor-tabs" aria-label="Sekce editoru">
        <a href="#job-basic"><FileText size={17} /> Základ</a>
        <a href="#job-publishing"><CalendarClock size={17} /> Publikace</a>
        <a href="#job-media"><ImageIcon size={17} /> Média</a>
        <a href="#job-content"><Sparkles size={17} /> Obsah</a>
        <a href="#job-display"><Eye size={17} /> Zobrazení</a>
      </nav>

      <section className="admin-card job-editor-section" id="job-basic">
        <div className="admin-card-head">
          <div>
            <h2>Základ nabídky</h2>
            <p>Název, firma a zařazení nabídky do filtrů veřejného webu.</p>
          </div>
          <FileText size={22} />
        </div>
        <div className="form-grid">
          <label className="field-group">
            <span>Název pozice</span>
            <input className="field" name="title" placeholder="např. Obchodní zástupce pro Vsetínsko" required defaultValue={job?.title ?? ""} />
            <small>Pište konkrétní název, podle kterého budou lidé nabídku hledat.</small>
          </label>
          <label className="field-group">
            <span>Firma</span>
            <input className="field" name="companyName" placeholder="Název zaměstnavatele" required defaultValue={job?.company.name ?? ""} />
            <small>Firma se použije i pro filtrování a veřejné zobrazení.</small>
          </label>
          <AssetUploadField
            accept="image/jpeg,image/png,image/webp"
            defaultValue={job?.company.logoUrl}
            help="Logo se zobrazí v kartě inzerátu a na profilu firmy. Ideálně PNG nebo WebP s průhledným pozadím."
            label="Logo firmy"
            name="companyLogoUrl"
            placeholder="/uploads/admin/logo.png nebo URL"
          />
          <label className="field-group">
            <span>Brand barva firmy</span>
            <input className="field" name="companyBrandColor" placeholder="#14532d" defaultValue={job?.company.brandColor ?? ""} />
            <small>Použije se pro barevný pás v náhledu nabídky a firemní branding.</small>
          </label>
          <label className="field-group">
            <span>Město</span>
            <select className="select" name="cityId" required defaultValue={job?.cityId}>
              {filters.cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span>Obor</span>
            <select className="select" name="categoryId" required defaultValue={job?.categoryId}>
              {filters.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span>Vzdělání</span>
            <select className="select" name="educationId" defaultValue={job?.educationId ?? ""}>
              <option value="">Bez požadavku</option>
              {filters.educations.map((education) => <option key={education.id} value={education.id}>{education.name}</option>)}
            </select>
          </label>
          <label className="field-group">
            <span>Úvazek</span>
            <select className="select" name="employmentTypeId" required defaultValue={job?.employmentTypeId}>
              {filters.employmentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="admin-card job-editor-section" id="job-publishing">
        <div className="admin-card-head">
          <div>
            <h2>Publikace a obchod</h2>
            <p>Stav, přesné datumy, expirace, topování a balíček.</p>
          </div>
          <CalendarClock size={22} />
        </div>
        <div className="job-editor-date-grid">
          <label className="field-group">
            <span>Stav publikace</span>
            <select className="select" name="status" defaultValue={job?.status ?? JobStatus.PENDING_PAYMENT}>
              <option value={JobStatus.DRAFT}>Koncept</option>
              <option value={JobStatus.PENDING_PAYMENT}>Čeká na platbu</option>
              <option value={JobStatus.ACTIVE}>Aktivní / publikovat</option>
              <option value={JobStatus.EXPIRED}>Expirovaný</option>
              <option value={JobStatus.ARCHIVED}>Archiv</option>
            </select>
          </label>
          <label className="field-group">
            <span>Balíček</span>
            <select className="select" name="packageId" defaultValue={job?.packageId ?? ""}>
              <option value="">Bez balíčku</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>{item.name} / {item.durationDays} dní{item.isTopPlacement ? ` / TOP ${item.topDays ?? ""} dní` : ""}</option>
              ))}
            </select>
          </label>
          <label className="field-group">
            <span>Zadáno</span>
            <input className="field" name="createdAt" type="datetime-local" defaultValue={dateTimeInput(job?.createdAt)} />
          </label>
          <label className="field-group">
            <span>Aktivní od</span>
            <input className="field" name="activeFrom" type="datetime-local" defaultValue={dateTimeInput(job?.activeFrom)} />
          </label>
          <label className="field-group">
            <span>Aktivní do</span>
            <input className="field" name="activeUntil" type="datetime-local" defaultValue={dateTimeInput(job?.activeUntil)} />
          </label>
          <label className="field-group">
            <span>Obnoveno</span>
            <input className="field" name="renewedAt" type="datetime-local" defaultValue={dateTimeInput(job?.renewedAt)} />
          </label>
          <label className="field-group">
            <span>Aktivní dní při obnově</span>
            <input className="field" min="1" name="durationDays" required type="number" defaultValue={job ? remainingDays(job.activeUntil) : 30} />
            <small>Použije se, když necháte „Aktivní do“ prázdné nebo inzerát obnovíte rychlou akcí.</small>
          </label>
          <label className="field-group">
            <span>Topovat dní</span>
            <input className="field" min="0" name="topDays" type="number" defaultValue={remainingTopDays} />
          </label>
          <label className="field-group">
            <span>Topovat do</span>
            <input className="field" name="topUntil" type="datetime-local" defaultValue={dateTimeInput(job?.topUntil)} />
          </label>
          <label className="field-group">
            <span>Barva zvýraznění</span>
            <input className="field" name="highlightColor" placeholder="#fff7ed" defaultValue={job?.highlightColor ?? ""} />
          </label>
        </div>
      </section>

      <section className="admin-card job-editor-section" id="job-media">
        <div className="admin-card-head">
          <div>
            <h2>Média, mzda a kontakt</h2>
            <p>Obrázky, PDF leták, mzda a kontaktní údaje pro veřejný detail.</p>
          </div>
          <ImageIcon size={22} />
        </div>
        <div className="form-grid">
          <AssetUploadField
            accept="image/jpeg,image/png,image/webp,image/gif"
            defaultValue={job?.previewImageUrl}
            help="Široký vizuál do horního pásu karty. Doporučený poměr je přibližně 16:6, například 1200 × 450 px."
            label="Brand / fotka do výpisu"
            name="previewImageUrl"
            placeholder="/uploads/admin/fotka.jpg nebo URL"
          />
          <AssetUploadField
            accept="image/jpeg,image/png,image/webp,image/gif"
            defaultValue={job?.detailImageUrl}
            help="Hlavní vizuál detailu nabídky."
            label="Hlavní fotka detailu"
            name="detailImageUrl"
            placeholder="/uploads/admin/detail.jpg nebo URL"
          />
          <AssetUploadField
            accept="application/pdf,image/jpeg,image/png,image/webp"
            defaultValue={job?.flyerUrl}
            help="PDF leták nebo obrázek s podklady k inzerátu."
            label="Leták / PDF"
            name="flyerUrl"
            placeholder="/uploads/admin/letak.pdf nebo URL"
          />
          <label className="field-group">
            <span>Mzda od</span>
            <input className="field" min="0" name="salaryMinCzk" type="number" defaultValue={job?.salaryMinCzk ?? ""} />
          </label>
          <label className="field-group">
            <span>Mzda do</span>
            <input className="field" min="0" name="salaryMaxCzk" type="number" defaultValue={job?.salaryMaxCzk ?? ""} />
          </label>
          <label className="field-group">
            <span>Kontaktní e-mail</span>
            <input className="field" name="contactEmail" placeholder="personalni@firma.cz" type="email" defaultValue={job?.contactEmail ?? ""} />
          </label>
          <label className="field-group">
            <span>Telefon</span>
            <input className="field" name="contactPhone" placeholder="+420..." defaultValue={job?.contactPhone ?? ""} />
          </label>
        </div>
      </section>

      <section className="admin-card job-editor-section" id="job-content">
        <div className="admin-card-head">
          <div>
            <h2>Obsah inzerátu</h2>
            <p>Texty, které rozhodují, jestli uchazeč odpoví.</p>
          </div>
          <Sparkles size={22} />
        </div>
        <div className="form-grid">
          <label className="field-group full">
            <span>Krátký úvod</span>
            <textarea className="textarea textarea-short" name="shortIntro" placeholder="Jedna až dvě věty, které se zobrazí ve výpisu." required defaultValue={job?.shortIntro ?? ""} />
          </label>
          <label className="field-group full">
            <span>Hlavní popis inzerátu</span>
            <textarea className="textarea textarea-large" name="description" placeholder="Popište práci jako souvislý text. Můžete použít odstavce." required defaultValue={job?.description ?? ""} />
          </label>
          <label className="field-group">
            <span>Požadavky</span>
            <textarea className="textarea" name="requirements" placeholder="Praxe, vzdělání, řidičský průkaz, dovednosti." defaultValue={job?.requirements ?? ""} />
          </label>
          <label className="field-group">
            <span>Benefity</span>
            <textarea className="textarea" name="benefits" placeholder="Mzda, stravenky, dovolená, směny, příspěvky." defaultValue={job?.benefits ?? ""} />
          </label>
        </div>
      </section>

      <section className="admin-card job-editor-section" id="job-display">
        <div className="admin-card-head">
          <div>
            <h2>Zobrazení a štítky</h2>
            <p>Jak se nabídka ukáže ve výpisu, na homepage a komu je určená.</p>
          </div>
          <Settings2 size={22} />
        </div>
        <div className="job-toggle-grid">
          <label className="admin-check"><input name="showImageInList" type="checkbox" defaultChecked={job?.showImageInList ?? false} /> Fotka ve výpisu</label>
          <label className="admin-check"><input name="showSalaryInPreview" type="checkbox" defaultChecked={job?.showSalaryInPreview ?? true} /> Mzda v náhledu</label>
          <label className="admin-check"><input name="showOnHomepage" type="checkbox" defaultChecked={job?.showOnHomepage ?? true} /> Homepage</label>
        </div>
        <div className="job-suitability-box">
          <strong>Vhodné pro</strong>
          <div className="meta">
            {filters.suitabilities.map((item) => (
              <label className="tag" key={item.id}>
                <input name="suitabilityIds" type="checkbox" value={item.id} defaultChecked={selectedSuitabilities.has(item.id)} /> {item.name}
              </label>
            ))}
          </div>
        </div>
      </section>

      <div className="job-editor-savebar">
        <span>Uloží změny obsahu, datumů, topování i zobrazení.</span>
        <button className="button" type="submit">Uložit inzerát</button>
      </div>
    </form>
  );
}
