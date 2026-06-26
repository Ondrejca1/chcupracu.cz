import { Send, Save, Sparkles } from "lucide-react";
import { JobReviewStatus } from "@prisma/client";
import { saveClientJob } from "@/lib/actions/client-jobs";
import type { getFilters } from "@/lib/queries";
import { money } from "@/lib/format";

type Filters = Awaited<ReturnType<typeof getFilters>>;
type ClientEditableJob = {
  id: string;
  title: string;
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
  showSalaryInPreview: boolean;
  salaryMinCzk: number | null;
  salaryMaxCzk: number | null;
  reviewStatus: JobReviewStatus;
  reviewNote: string | null;
  suitabilities: { suitabilityId: string }[];
};

export function ClientJobForm({
  filters,
  packages,
  job
}: {
  filters: Filters;
  packages: { id: string; name: string; durationDays: number; priceCzk: number; isTopPlacement: boolean; topDays: number | null; description: string | null }[];
  job?: ClientEditableJob;
}) {
  const selectedSuitabilities = new Set(job?.suitabilities.map((item) => item.suitabilityId) ?? []);

  return (
    <form action={saveClientJob} className="client-job-form">
      {job && <input name="id" type="hidden" value={job.id} />}
      <section className="client-form-hero">
        <div>
          <span className="admin-kicker">Zadání pracovního inzerátu</span>
          <h1>{job ? "Upravit inzerát" : "Nový inzerát"}</h1>
          <p>Vyplňte obsah, zařazení a balíček. Redakce po odeslání inzerát zkontroluje a připraví k publikaci.</p>
        </div>
        <div className="client-form-actions">
          <button className="button secondary" name="intent" type="submit" value="draft">
            <Save size={17} /> Uložit koncept
          </button>
          <button className="button" name="intent" type="submit" value="submit">
            <Send size={17} /> Odeslat ke schválení
          </button>
        </div>
      </section>

      {job?.reviewStatus === JobReviewStatus.CHANGES_REQUESTED && job.reviewNote && (
        <section className="client-alert">
          <strong>Redakce žádá úpravu</strong>
          <p>{job.reviewNote}</p>
        </section>
      )}

      <section className="client-card">
        <div className="admin-card-head">
          <div>
            <h2>Základ nabídky</h2>
            <p>Název pozice, lokalita a zařazení do veřejných filtrů.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field-group">
            <span>Název pozice</span>
            <input className="field" name="title" placeholder="např. Elektrikář ve Vsetíně" required defaultValue={job?.title ?? ""} />
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
          <label className="field-group">
            <span>Kontaktní e-mail</span>
            <input className="field" name="contactEmail" placeholder="personalni@firma.cz" type="email" defaultValue={job?.contactEmail ?? ""} />
          </label>
          <label className="field-group">
            <span>Telefon</span>
            <input className="field" name="contactPhone" placeholder="+420..." defaultValue={job?.contactPhone ?? ""} />
          </label>
          <label className="field-group">
            <span>Mzda od</span>
            <input className="field" min="0" name="salaryMinCzk" type="number" defaultValue={job?.salaryMinCzk ?? ""} />
          </label>
          <label className="field-group">
            <span>Mzda do</span>
            <input className="field" min="0" name="salaryMaxCzk" type="number" defaultValue={job?.salaryMaxCzk ?? ""} />
          </label>
          <label className="admin-check client-check">
            <input name="showSalaryInPreview" type="checkbox" defaultChecked={job?.showSalaryInPreview ?? true} /> Zobrazit mzdu ve výpisu
          </label>
        </div>
      </section>

      <section className="client-card">
        <div className="admin-card-head">
          <div>
            <h2>Obsah inzerátu</h2>
            <p>Texty pište konkrétně. Redakce je může před publikací jazykově doladit.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field-group full">
            <span>Krátký úvod</span>
            <textarea className="textarea textarea-short" name="shortIntro" required defaultValue={job?.shortIntro ?? ""} />
          </label>
          <label className="field-group full">
            <span>Náplň práce</span>
            <textarea className="textarea textarea-large" name="description" required defaultValue={job?.description ?? ""} />
          </label>
          <label className="field-group">
            <span>Požadavky</span>
            <textarea className="textarea" name="requirements" defaultValue={job?.requirements ?? ""} />
          </label>
          <label className="field-group">
            <span>Benefity</span>
            <textarea className="textarea" name="benefits" defaultValue={job?.benefits ?? ""} />
          </label>
        </div>
      </section>

      <section className="client-card">
        <div className="admin-card-head">
          <div>
            <h2>Balíček a doplňky</h2>
            <p>Balíček určí cenu a délku zveřejnění. Fakturace vznikne až po schválení redakcí.</p>
          </div>
          <Sparkles size={22} />
        </div>
        <div className="client-package-grid">
          <label className="client-package-choice">
            <input name="packageId" type="radio" value="" defaultChecked={!job?.packageId} />
            <strong>Bez vybraného balíčku</strong>
            <span>Redakce se ozve s doporučením.</span>
          </label>
          {packages.map((item) => (
            <label className="client-package-choice" key={item.id}>
              <input name="packageId" type="radio" value={item.id} defaultChecked={job?.packageId === item.id} />
              <strong>{item.name}</strong>
              <span>{money(item.priceCzk)} · {item.durationDays} dní{item.isTopPlacement ? ` · TOP ${item.topDays ?? 0} dní` : ""}</span>
              {item.description && <small>{item.description}</small>}
            </label>
          ))}
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

      <section className="client-card">
        <div className="admin-card-head">
          <div>
            <h2>Média a poznámka pro redakci</h2>
            <p>Logo a grafiku může doplnit redakce. Sem můžete vložit odkazy na připravené podklady.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field-group">
            <span>Fotka do výpisu / URL</span>
            <input className="field" name="previewImageUrl" placeholder="https://..." defaultValue={job?.previewImageUrl ?? ""} />
          </label>
          <label className="field-group">
            <span>Fotka detailu / URL</span>
            <input className="field" name="detailImageUrl" placeholder="https://..." defaultValue={job?.detailImageUrl ?? ""} />
          </label>
          <label className="field-group">
            <span>Leták nebo PDF / URL</span>
            <input className="field" name="flyerUrl" placeholder="https://..." defaultValue={job?.flyerUrl ?? ""} />
          </label>
          <label className="field-group full">
            <span>Poznámka pro redakci</span>
            <textarea className="textarea textarea-short" name="clientNote" placeholder="Termín nástupu, speciální přání, podklady k fakturaci..." />
          </label>
        </div>
      </section>

      <div className="job-editor-savebar client-savebar">
        <span>Koncept zůstane jen ve vaší sekci. Odeslaný inzerát uvidí redakce ke schválení.</span>
        <div className="client-form-actions">
          <button className="button secondary" name="intent" type="submit" value="draft">Uložit koncept</button>
          <button className="button" name="intent" type="submit" value="submit">Odeslat ke schválení</button>
        </div>
      </div>
    </form>
  );
}
