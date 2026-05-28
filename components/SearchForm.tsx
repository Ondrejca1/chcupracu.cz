import { Search } from "lucide-react";
import type { getFilters } from "@/lib/queries";

type Filters = Awaited<ReturnType<typeof getFilters>>;

export function SearchForm({ filters, compact = false }: { filters: Filters; compact?: boolean }) {
  return (
    <form action="/" className={compact ? "filters" : "search-box"}>
      <label className={compact ? "filter-field" : "search-field"}>
        {compact && <span>Pozice nebo firma</span>}
        <input className="field" name="q" placeholder="Jakou práci hledáte?" />
      </label>
      <label className={compact ? "filter-field" : "search-field"}>
        {compact && <span>Lokalita</span>}
        <select className="select" name="city" defaultValue="">
          <option value="">Vsetín a okolí</option>
          {filters.cities.map((city) => (
            <option key={city.id} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>
      </label>
      {!compact && (
        <button className="button" type="submit">
          <Search size={18} /> Hledat
        </button>
      )}
      {compact && (
        <>
          <label className="filter-field">
            <span>Obor</span>
            <select className="select" name="category" defaultValue="">
              <option value="">Všechny obory</option>
              {filters.categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Vzdělání</span>
            <select className="select" name="education" defaultValue="">
              <option value="">Vzdělání nerozhoduje</option>
              {filters.educations.map((education) => (
                <option key={education.id} value={education.slug}>
                  {education.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Úvazek</span>
            <select className="select" name="employment" defaultValue="">
              <option value="">Všechny úvazky</option>
              {filters.employmentTypes.map((type) => (
                <option key={type.id} value={type.slug}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Vhodné pro</span>
            <select className="select" name="suitable" defaultValue="">
              <option value="">Vhodné pro kohokoliv</option>
              {filters.suitabilities.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Mzda od</span>
            <input className="field" min="0" name="salaryMin" placeholder="např. 30000" type="number" />
          </label>
          <label className="filter-field">
            <span>Mzda do</span>
            <input className="field" min="0" name="salaryMax" placeholder="např. 50000" type="number" />
          </label>
          <button className="button" type="submit">
            Upřesnit hledání
          </button>
        </>
      )}
    </form>
  );
}
