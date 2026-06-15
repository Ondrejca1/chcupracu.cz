import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Newspaper, Sparkles } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { SearchForm } from "@/components/SearchForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SmartImage } from "@/components/SmartImage";
import { money } from "@/lib/format";
import { getAdForSlot, getCurrentIssue, getFeaturedCompanies, getFilters, getJobVisibilityCounts, getSearchSuggestions, searchJobs, type JobSearchParams } from "@/lib/queries";

type HomepageJob = Awaited<ReturnType<typeof searchJobs>>[number];

function rotateDaily<T>(items: T[]) {
  if (items.length < 2) return items;
  const offset = Math.floor(Date.now() / 86_400_000) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function arrangeHomepageJobs(jobs: HomepageJob[]) {
  const topJobs = rotateDaily(jobs.filter((job) => job.isTop));
  const regularJobs = rotateDaily(jobs.filter((job) => !job.isTop));
  const arranged: { job: HomepageJob; wide?: boolean }[] = [];

  arranged.push(...topJobs.slice(0, 2).map((job) => ({ job })));
  arranged.push(...regularJobs.slice(0, 10).map((job, index) => ({ job, wide: index === 4 })));
  arranged.push(...topJobs.slice(2, 3).map((job) => ({ job, wide: true })));
  arranged.push(...regularJobs.slice(10, 21).map((job, index) => ({ job, wide: index === 5 })));
  arranged.push(...topJobs.slice(3, 6).map((job) => ({ job })));
  arranged.push(...regularJobs.slice(21).map((job) => ({ job })));

  return arranged.slice(0, 30);
}

export default async function Home({ searchParams }: { searchParams: Promise<JobSearchParams> }) {
  const params = await searchParams;
  const [filters, jobs, suggestions, currentIssue, homepageAd, sidebarAd, featuredCompanies, jobCounts] = await Promise.all([
    getFilters(),
    searchJobs(params, 80, { homepageOnly: true }),
    getSearchSuggestions(),
    getCurrentIssue(),
    getAdForSlot("homepage_strip"),
    getAdForSlot("sidebar_box"),
    getFeaturedCompanies(4),
    getJobVisibilityCounts()
  ]);
  const homepageJobs = arrangeHomepageJobs(jobs);
  const issue = currentIssue ?? {
    title: "Týdeník Jalovec plus Sport Jalovec",
    coverImageUrl: "/ads/jalovec-aktualni-vydani.jpg",
    targetUrl: "https://www.jalovec.cz",
    note: "Aktuální vydání a lokální tipy pro čtenáře z Valašska."
  };

  return (
    <>
      <SiteHeader />
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Lokální práce pro Vsetínsko</span>
            <h1>Práce na Vsetíně a okolí bez zbytečného hledání</h1>
            <p>Aktuální nabídky z Valašska na jednom místě. Rychle najděte práci ve Vsetíně, Rožnově, Valmezu, Velkých Karlovicích i okolních obcích.</p>
            <SearchForm filters={filters} suggestions={suggestions} values={params} />
          </div>
          <aside className="hero-promo" aria-label="Regionální pracovní portál">
            <SmartImage alt="Práce a zaměstnavatelé na Vsetínsku" className="hero-promo-image" priority sizes="(max-width: 1180px) 100vw, 430px" src="/preview-assets/hero-workers.png" />
            <div>
              <span>Pro firmy</span>
              <h2>Nábor v regionu bez složité administrativy</h2>
              <p>Firmám pomůžeme s textem nabídky, zvýrazněním i propagací v lokálním médiu.</p>
              <div className="promo-badges">
                <strong>Web + tisk</strong>
                <strong>Top pozice</strong>
                <strong>Lokální zásah</strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="quick-section">
        <div className="container quick-grid">
          <Link href="/jobs?category=remeslna-vyroba-a-manualni-prace" className="quick-card">
            <Sparkles size={24} />
            <span>Nejžádanější</span>
            <strong>Práce ve výrobě</strong>
          </Link>
          <Link href="/jobs?employment=brigada" className="quick-card">
            <Sparkles size={24} />
            <span>Rychlý nástup</span>
            <strong>Brigády na Vsetíně</strong>
          </Link>
          <Link href="/jobs?suitable=absolvent" className="quick-card">
            <Sparkles size={24} />
            <span>Bez praxe</span>
            <strong>Pro absolventy</strong>
          </Link>
          <Link href="/jobs?category=administrativa-zakaznicky-servis" className="quick-card">
            <Sparkles size={24} />
            <span>Kancelář</span>
            <strong>Administrativa</strong>
          </Link>
        </div>
      </section>

      <section className="commercial-band">
        <div className="container commercial-grid">
          <a className="commercial-slot issue-slot" href={issue.targetUrl ?? "https://www.jalovec.cz"} target="_blank" rel="noreferrer">
            <SmartImage alt="Aktuální vydání týdeníku Jalovec" className="issue-image" sizes="92px" src={issue.coverImageUrl} />
            <div>
              <small>Aktuální vydání Jalovce</small>
              <strong>{issue.title}</strong>
              <span>{issue.note ?? "Aktuální vydání, partner týdne a lokální náborové tipy."}</span>
            </div>
          </a>
          <a className="commercial-slot" href={homepageAd?.targetUrl ?? "/jobs"} target={homepageAd?.targetUrl ? "_blank" : undefined} rel={homepageAd?.targetUrl ? "noreferrer" : undefined}>
            <small>{homepageAd?.location ?? "Hlavní reklamní pozice"}</small>
            <strong>{homepageAd?.name ?? "Partner týdne: volná pozice"}</strong>
            <span>{homepageAd ? `${money(homepageAd.priceCzk)} / ${homepageAd.durationDays} dní` : "Viditelný prostor pro lokální nábor"}</span>
          </a>
          <div className="commercial-slot">
            <small>Top lokalita</small>
            <strong>Práce na Vsetíně</strong>
            <span>Nabídky blízko domova a bez dojíždění navíc</span>
          </div>
          <div className="commercial-slot">
            <small>Top obor</small>
            <strong>Výroba a řemesla</strong>
            <span>Řemesla, výroba, logistika a technické pozice</span>
          </div>
        </div>
      </section>

      <section className="company-strip">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Firmy v regionu</span>
              <h2>Prostor pro větší náborové kampaně</h2>
            </div>
            <Link href="/jobs" className="text-link">
              Zobrazit nabídky <ArrowRight size={17} />
            </Link>
          </div>
          <div className="company-grid">
            {featuredCompanies.map((company, index) => (
              <Link href={`/firmy/${company.slug}`} className={`company-tile ${index % 2 === 0 ? "dark" : "light"}`} key={company.id} style={{ "--company-accent": company.brandColor ?? undefined } as CSSProperties}>
                <Building2 size={24} />
                <span>{company._count.jobs} aktivních nabídek</span>
                <strong>{company.name}</strong>
              </Link>
            ))}
            {featuredCompanies.length === 0 && (
              <div className="company-tile light">
                <Building2 size={24} />
                <span>Firmy v regionu</span>
                <strong>Po vložení inzerátů se zde zobrazí zaměstnavatelé.</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="section">
        <div className="container grid" id="nabidky">
          <aside className="filter-column">
            <SearchForm compact filters={filters} suggestions={suggestions} values={params} />
            <a className="side-ad jalovec-issue" href={sidebarAd?.targetUrl ?? issue.targetUrl ?? "https://www.jalovec.cz"} target="_blank" rel="noreferrer">
              <SmartImage alt={sidebarAd?.name ?? "Aktuální vydání týdeníku Jalovec"} className="side-ad-image" sizes="300px" src={sidebarAd?.creativeUrl ?? issue.coverImageUrl} />
              <Newspaper size={24} />
              <strong>{sidebarAd?.name ?? issue.title}</strong>
              <p>{sidebarAd?.note ?? issue.note ?? "Konkrétní reklamní blok pro týdeník, který může redakce pravidelně měnit."}</p>
            </a>
          </aside>
          <section>
            <div className="section-head jobs-head">
              <div>
                <span className="eyebrow">Vybrané pracovní nabídky</span>
                <h2>{jobCounts.active > 0 ? `${jobCounts.active} aktivních nabídek` : "Nabídky už se připravují"}</h2>
              </div>
              <p>Na homepage je vybráno {jobCounts.homepage} z nich. Všechny aktivní nabídky najdete ve vyhledávání.</p>
            </div>
            <div className="cards job-grid">
              {homepageJobs.map(({ job, wide }) => (
                <JobCard job={job} key={job.id} wide={wide} />
              ))}
              {homepageJobs.length === 0 && (
                <div className="empty-marketing">
                  <span>0 vybraných nabídek na homepage</span>
                  <h2>První nabídky se tu brzy objeví.</h2>
                  <p>Mezitím můžete projít vyhledávání nebo se redakci ozvat s pracovním inzerátem pro Vsetínsko.</p>
                  <Link className="button secondary" href="/admin">
                    Přejít do redakce
                  </Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
