"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { getFilters, JobSearchParams } from "@/lib/queries";

type Filters = Awaited<ReturnType<typeof getFilters>>;
const fieldValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

export function SearchForm({
  action = "/jobs",
  filters,
  compact = false,
  suggestions = [],
  values = {}
}: {
  action?: string;
  filters: Filters;
  compact?: boolean;
  suggestions?: string[];
  values?: JobSearchParams;
}) {
  const [query, setQuery] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!isSuggestOpen || normalized.length < 2) return [];
    return suggestions.filter((item) => item.toLowerCase().includes(normalized)).slice(0, 8);
  }, [isSuggestOpen, query, suggestions]);

  return (
    <form action={action} className={compact ? "filters" : "search-box"} onSubmit={() => {
      setIsSuggestOpen(false);
      setTimeout(() => setQuery(""), 0);
    }}>
      <label className={compact ? "filter-field suggest-wrap" : "search-field suggest-wrap"}>
        {compact && <span>Pozice nebo firma</span>}
        <input
          className="field"
          name="q"
          placeholder="Jakou práci hledáte?"
          value={query}
          onBlur={() => setTimeout(() => setIsSuggestOpen(false), 140)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsSuggestOpen(true);
          }}
          onFocus={() => setIsSuggestOpen(true)}
          autoComplete="off"
        />
        {matches.length > 0 && (
          <div className="suggest-menu">
            {matches.map((item) => (
              <button
                className="suggest-item"
                key={item}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(item);
                  setIsSuggestOpen(false);
                }}
              >
                <strong>{item}</strong>
                <span>vyhledat</span>
              </button>
            ))}
          </div>
        )}
      </label>
      <label className={compact ? "filter-field" : "search-field"}>
        {compact && <span>Lokalita</span>}
        <select className="select" name="city" defaultValue={fieldValue(values.city)}>
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
            <select className="select" name="category" defaultValue={fieldValue(values.category)}>
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
            <select className="select" name="education" defaultValue={fieldValue(values.education)}>
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
            <select className="select" name="employment" defaultValue={fieldValue(values.employment)}>
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
            <select className="select" name="suitable" defaultValue={fieldValue(values.suitable)}>
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
            <input className="field" min="0" name="salaryMin" placeholder="např. 30000" type="number" defaultValue={fieldValue(values.salaryMin)} />
          </label>
          <label className="filter-field">
            <span>Mzda do</span>
            <input className="field" min="0" name="salaryMax" placeholder="např. 50000" type="number" defaultValue={fieldValue(values.salaryMax)} />
          </label>
          <button className="button" type="submit">
            Upřesnit hledání
          </button>
        </>
      )}
    </form>
  );
}
