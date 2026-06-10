import { JobStatus } from "@prisma/client";
import { upsertJob } from "@/app/actions";
import { AssetUploadField } from "@/components/AssetUploadField";
import type { getFilters } from "@/lib/queries";

type Filters = Awaited<ReturnType<typeof getFilters>>;
type EditableJob = {
  id: string;
  title: string;
  company: { name: string };
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
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "ARCHIVED";
  isTop: boolean;
  suitabilities: { suitabilityId: string }[];
};

export function JobEditor({ filters, packages, job }: { filters: Filters; packages: { id: string; name: string; durationDays: number; isTopPlacement: boolean; topDays: number | null }[]; job?: EditableJob }) {
  const selectedSuitabilities = new Set(job?.suitabilities.map((item) => item.suitabilityId) ?? []);
  return (
    <form action={async (formData) => {
  "use server";
  await upsertJob(formData);
}} className="admin-card form-grid job-editor-form">
      <div className="admin-form-intro full">
        <span>Pracovní nabídka</span>
        <h2>{job ? "Upravit inzerát" : "Nový inzerát"}</h2>
        <p>Základní obsah, publikace, topování, média a kontakt jsou oddělené, aby šlo inzerát rychle zkontrolovat před zveřejněním.</p>
      </div>
      {job && <input name="id" type="hidden" value={job.id} />}
      <div className="admin-form-section full">Základ nabídky</div>
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
        <small>Pokud není nutné, nechte bez požadavku.</small>
      </label>
      <label className="field-group">
        <span>Úvazek</span>
        <select className="select" name="employmentTypeId" required defaultValue={job?.employmentTypeId}>
          {filters.employmentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
      </label>
      <div className="admin-form-section full">Publikace a obchod</div>
      <label className="field-group">
        <span>Balíček</span>
        <select className="select" name="packageId" defaultValue={job?.packageId ?? ""}>
          <option value="">Bez balíčku</option>
          {packages.map((item) => (
            <option key={item.id} value={item.id}>{item.name} / {item.durationDays} dní{item.isTopPlacement ? ` / TOP ${item.topDays ?? ""} dní` : ""}</option>
          ))}
        </select>
        <small>Balíček může předvyplnit cenu, délku topování a zvýraznění.</small>
      </label>
      <label className="field-group">
        <span>Stav publikace</span>
        <select className="select" name="status" defaultValue={job?.status ?? JobStatus.ACTIVE}>
          <option value={JobStatus.ACTIVE}>Publikovat</option>
          <option value={JobStatus.DRAFT}>Uložit jako koncept</option>
        </select>
        <small>Koncept není vidět na veřejném webu.</small>
      </label>
      <label className="field-group">
        <span>Aktivní dní</span>
        <input className="field" min="1" name="durationDays" required type="number" defaultValue={30} />
      </label>
      <label className="field-group">
        <span>Topovat dní</span>
        <input className="field" min="0" name="topDays" type="number" defaultValue={job?.isTop ? 14 : 0} />
      </label>
      <label className="field-group full">
        <span>Barva zvýraznění</span>
        <input className="field" name="highlightColor" placeholder="#fff7ed" defaultValue={job?.highlightColor ?? ""} />
        <small>Jemná barva pozadí karty. Nechte prázdné pro standardní vzhled.</small>
      </label>
      <div className="admin-form-section full">Média, mzda a kontakt</div>
      <AssetUploadField
        accept="image/jpeg,image/png,image/webp,image/gif"
        defaultValue={job?.previewImageUrl}
        help="Zobrazí se ve výpisu, pokud je zapnutá volba Fotka ve výpisu."
        label="Fotka do výpisu"
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
      <div className="admin-form-section full">Zobrazení</div>
      <label className="admin-check"><input name="showImageInList" type="checkbox" defaultChecked={job?.showImageInList ?? false} /> Fotka ve výpisu</label>
      <label className="admin-check"><input name="showSalaryInPreview" type="checkbox" defaultChecked={job?.showSalaryInPreview ?? true} /> Mzda v náhledu</label>
      <label className="admin-check"><input name="showOnHomepage" type="checkbox" defaultChecked={job?.showOnHomepage ?? true} /> Homepage</label>
      <div className="admin-form-section full">Obsah inzerátu</div>
      <label className="field-group full">
        <span>Krátký úvod</span>
        <textarea className="textarea textarea-short" name="shortIntro" placeholder="Jedna až dvě věty, které se zobrazí ve výpisu." required defaultValue={job?.shortIntro ?? ""} />
        <small>Maximálně stručně: komu je nabídka určená a proč má člověk rozkliknout detail.</small>
      </label>
      <label className="field-group full">
        <span>Hlavní popis inzerátu</span>
        <textarea className="textarea textarea-large" name="description" placeholder="Popište práci jako souvislý text. Můžete použít odstavce." required defaultValue={job?.description ?? ""} />
        <small>Sem patří náplň práce, prostředí, směny a vše důležité pro rozhodnutí uchazeče.</small>
      </label>
      <div className="content-two-col full">
        <label className="field-group">
          <span>Požadavky</span>
          <textarea className="textarea" name="requirements" placeholder="Praxe, vzdělání, řidičský průkaz, dovednosti." defaultValue={job?.requirements ?? ""} />
        </label>
        <label className="field-group">
          <span>Benefity</span>
          <textarea className="textarea" name="benefits" placeholder="Mzda, stravenky, dovolená, směny, příspěvky." defaultValue={job?.benefits ?? ""} />
        </label>
      </div>
      <div className="full">
        <strong>Vhodné pro</strong>
        <div className="meta" style={{ marginTop: 8 }}>
          {filters.suitabilities.map((item) => (
            <label className="tag" key={item.id}>
              <input name="suitabilityIds" type="checkbox" value={item.id} defaultChecked={selectedSuitabilities.has(item.id)} /> {item.name}
            </label>
          ))}
        </div>
      </div>
      <button className="button full" type="submit">
        Uložit inzerát
      </button>
    </form>
  );
}
