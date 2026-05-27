import { Search } from "lucide-react";
import type { getFilters } from "@/lib/queries";

type Filters = Awaited<ReturnType<typeof getFilters>>;

export function SearchForm({ filters, compact = false }: { filters: Filters; compact?: boolean }) {
  return (
    <form action="/" className={compact ? "filters" : "search-box"}>
      <input className="field" name="q" placeholder="Jakou práci hledáte?" />
      <select className="select" name="city" defaultValue="">
        <option value="">Vsetín a okolí</option>
        {filters.cities.map((city) => (
          <option key={city.id} value={city.slug}>
            {city.name}
          </option>
        ))}
      </select>
      {!compact && (
        <button className="button" type="submit">
          <Search size={18} /> Hledat
        </button>
      )}
      {compact && (
        <>
          <select className="select" name="category" defaultValue="">
            <option value="">Všechny obory</option>
            {filters.categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <select className="select" name="education" defaultValue="">
            <option value="">Vzdělání nerozhoduje</option>
            {filters.educations.map((education) => (
              <option key={education.id} value={education.slug}>
                {education.name}
              </option>
            ))}
          </select>
          <select className="select" name="employment" defaultValue="">
            <option value="">Všechny úvazky</option>
            {filters.employmentTypes.map((type) => (
              <option key={type.id} value={type.slug}>
                {type.name}
              </option>
            ))}
          </select>
          <select className="select" name="suitable" defaultValue="">
            <option value="">Vhodné pro kohokoliv</option>
            {filters.suitabilities.map((item) => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <input className="field" min="0" name="salaryMin" placeholder="Mzda od" type="number" />
          <input className="field" min="0" name="salaryMax" placeholder="Mzda do" type="number" />
          <button className="button" type="submit">
            Upřesnit hledání
          </button>
        </>
      )}
    </form>
  );
}
