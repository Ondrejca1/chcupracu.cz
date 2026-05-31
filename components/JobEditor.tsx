import { JobStatus } from "@prisma/client";
import { upsertJob } from "@/app/actions";
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
      <input className="field" name="title" placeholder="Název pozice" required defaultValue={job?.title ?? ""} />
      <input className="field" name="companyName" placeholder="Firma" required defaultValue={job?.company.name ?? ""} />
      <select className="select" name="cityId" required defaultValue={job?.cityId}>
        {filters.cities.map((city) => (
          <option key={city.id} value={city.id}>
            {city.name}
          </option>
        ))}
      </select>
      <select className="select" name="categoryId" required defaultValue={job?.categoryId}>
        {filters.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select className="select" name="educationId" defaultValue={job?.educationId ?? ""}>
        <option value="">Bez požadavku</option>
        {filters.educations.map((education) => (
          <option key={education.id} value={education.id}>
            {education.name}
          </option>
        ))}
      </select>
      <select className="select" name="employmentTypeId" required defaultValue={job?.employmentTypeId}>
        {filters.employmentTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </select>
      <div className="admin-form-section full">Publikace a obchod</div>
      <select className="select" name="packageId" defaultValue={job?.packageId ?? ""}>
        <option value="">Bez balíčku</option>
        {packages.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} / {item.durationDays} dní{item.isTopPlacement ? ` / TOP ${item.topDays ?? ""} dní` : ""}
          </option>
        ))}
      </select>
      <select className="select" name="status" defaultValue={job?.status ?? JobStatus.ACTIVE}>
        <option value={JobStatus.ACTIVE}>Publikovat</option>
        <option value={JobStatus.DRAFT}>Uložit jako koncept</option>
      </select>
      <input className="field" min="1" name="durationDays" placeholder="Aktivní dní" required type="number" defaultValue={30} />
      <input className="field" min="0" name="topDays" placeholder="Topovat dní" type="number" defaultValue={job?.isTop ? 14 : 0} />
      <input className="field" name="highlightColor" placeholder="Barva nabídky, např. #fff7ed" defaultValue={job?.highlightColor ?? ""} />
      <div className="admin-form-section full">Média a kontakt</div>
      <input className="field" name="previewImageUrl" placeholder="URL fotky do výpisu" defaultValue={job?.previewImageUrl ?? ""} />
      <input className="field" name="detailImageUrl" placeholder="URL hlavní fotky detailu" defaultValue={job?.detailImageUrl ?? ""} />
      <input className="field" name="flyerUrl" placeholder="URL letáku / PDF kampaně" defaultValue={job?.flyerUrl ?? ""} />
      <input className="field" min="0" name="salaryMinCzk" placeholder="Mzda od" type="number" defaultValue={job?.salaryMinCzk ?? ""} />
      <input className="field" min="0" name="salaryMaxCzk" placeholder="Mzda do" type="number" defaultValue={job?.salaryMaxCzk ?? ""} />
      <input className="field" name="contactEmail" placeholder="Kontaktní e-mail" type="email" defaultValue={job?.contactEmail ?? ""} />
      <input className="field" name="contactPhone" placeholder="Kontaktní telefon" defaultValue={job?.contactPhone ?? ""} />
      <div className="admin-form-section full">Zobrazení</div>
      <label className="tag"><input name="showImageInList" type="checkbox" defaultChecked={job?.showImageInList ?? false} /> Zobrazit fotku ve výpisu</label>
      <label className="tag"><input name="showSalaryInPreview" type="checkbox" defaultChecked={job?.showSalaryInPreview ?? true} /> Zobrazit mzdu v náhledu</label>
      <label className="tag"><input name="showOnHomepage" type="checkbox" defaultChecked={job?.showOnHomepage ?? true} /> Zobrazit na hlavní straně</label>
      <div className="admin-form-section full">Obsah inzerátu</div>
      <textarea className="textarea full" name="shortIntro" placeholder="Krátký úvod inzerátu" required defaultValue={job?.shortIntro ?? ""} />
      <textarea className="textarea full" name="description" placeholder="Náplň práce" required defaultValue={job?.description ?? ""} />
      <textarea className="textarea full" name="requirements" placeholder="Požadavky" defaultValue={job?.requirements ?? ""} />
      <textarea className="textarea full" name="benefits" placeholder="Benefity" defaultValue={job?.benefits ?? ""} />
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
