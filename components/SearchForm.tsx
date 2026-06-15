"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import type { getFilters, JobSearchParams } from "@/lib/queries";

type Filters = Awaited<ReturnType<typeof getFilters>>;
const fieldValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] ?? "" : value ?? "");

export function SearchForm({
  action = "/jobs#vysledky",
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
  const [query, setQuery] = useState(fieldValue(values.q));
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const activeChips = useMemo(() => {
    const entries = [
      { key: "q", value: fieldValue(values.q), label: fieldValue(values.q) },
      { key: "city", value: fieldValue(values.city), label: filters.cities.find((item) => item.slug === fieldValue(values.city))?.name },
      { key: "category", value: fieldValue(values.category), label: filters.categories.find((item) => item.slug === fieldValue(values.category))?.name },
      { key: "education", value: fieldValue(values.education), label: filters.educations.find((item) => item.slug === fieldValue(values.education))?.name },
      { key: "employment", value: fieldValue(values.employment), label: filters.employmentTypes.find((item) => item.slug === fieldValue(values.employment))?.name },
      { key: "suitable", value: fieldValue(values.suitable), label: filters.suitabilities.find((item) => item.slug === fieldValue(values.suitable))?.name },
      { key: "salaryMin", value: fieldValue(values.salaryMin), label: fieldValue(values.salaryMin) ? `od ${fieldValue(values.salaryMin)} Kč` : "" },
      { key: "salaryMax", value: fieldValue(values.salaryMax), label: fieldValue(values.salaryMax) ? `do ${fieldValue(values.salaryMax)} Kč` : "" },
      { key: "sort", value: fieldValue(values.sort), label: fieldValue(values.sort) === "salary" ? "řazení: mzda" : fieldValue(values.sort) === "newest" ? "řazení: nejnovější" : "" }
    ];
    return entries.filter((item) => item.value && item.label);
  }, [filters, values]);
  const chipHref = (key: string) => {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(values)) {
      const first = fieldValue(value);
      if (first && name !== key) params.set(name, first);
    }
    return `/jobs${params.size ? `?${params}` : ""}#vysledky`;
  };
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
      {compact && (
        <div className="filter-panel-head">
          <div>
            <span>Filtry</span>
            <strong>{activeChips.length > 0 ? `${activeChips.length} aktivní` : "Zpřesnit výsledky"}</strong>
          </div>
          <SlidersHorizontal size={20} />
        </div>
      )}
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
            <span>Řazení</span>
            <select className="select" name="sort" defaultValue={fieldValue(values.sort)}>
              <option value="">Topované a doporučené</option>
              <option value="newest">Nejnovější</option>
              <option value="salary">Mzda</option>
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
          {activeChips.length > 0 && (
            <div className="active-filter-chips">
              {activeChips.map((chip) => (
                <Link className="filter-chip" href={chipHref(chip.key)} key={chip.key}>
                  {chip.label} <span>×</span>
                </Link>
              ))}
              <Link className="filter-chip clear" href="/jobs#vysledky">Vyčistit</Link>
            </div>
          )}
          <button className="button" type="submit">
            Upřesnit hledání
          </button>
        </>
      )}
    </form>
  );
}
