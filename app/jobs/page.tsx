import Link from "next/link";
import { Newspaper, Search } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { SearchForm } from "@/components/SearchForm";
import { SiteHeader } from "@/components/SiteHeader";
import { SmartImage } from "@/components/SmartImage";
import { getAdForSlot, getCurrentIssue, getFilters, getSearchSuggestions, searchJobs, type JobSearchParams } from "@/lib/queries";

export default async function JobsPage({ searchParams }: { searchParams: Promise<JobSearchParams> }) {
  const params = await searchParams;
  const [filters, jobs, suggestions, currentIssue, topAd, sidebarAd] = await Promise.all([
    getFilters(),
    searchJobs(params, 80),
    getSearchSuggestions(),
    getCurrentIssue(),
    getAdForSlot("jobs_top_strip"),
    getAdForSlot("sidebar_box")
  ]);
  const issue = currentIssue ?? {
    title: "Aktuální vydání Jalovce",
    coverImageUrl: "/ads/jalovec-aktualni-vydani.jpg",
    targetUrl: "https://www.jalovec.cz",
    note: "Tady může být Jalovec, generální partner náboru nebo větší firemní kampaň."
  };

  return (
    <>
      <SiteHeader />

      <section className="search-hero">
        <div className="container search-hero-inner">
          <div>
            <span className="eyebrow">Vyhledávání práce</span>
            <h1>Najděte nabídku podle pozice, města nebo oboru</h1>
            <p>Samostatná stránka pro hledání drží filtry, URL a výsledky pohromadě, takže se s ní dá dobře pracovat i v reklamách a Google indexaci.</p>
          </div>
          <SearchForm filters={filters} suggestions={suggestions} values={params} />
        </div>
      </section>

      <section className="commercial-band search-ad-band">
        <div className="container">
          <a className="commercial-slot issue-slot issue-slot-wide" href={topAd?.targetUrl ?? issue.targetUrl ?? "https://www.jalovec.cz"} target="_blank" rel="noreferrer">
            <SmartImage alt={topAd?.name ?? "Aktuální vydání týdeníku Jalovec"} className="issue-image issue-image-wide" sizes="120px" src={topAd?.creativeUrl ?? issue.coverImageUrl} />
            <div>
              <small>{topAd ? "Reklamní partner" : "Aktuální vydání Jalovce"}</small>
              <strong>{topAd?.name ?? issue.title}</strong>
              <span>{topAd?.note ?? issue.note ?? "Tady může být Jalovec, generální partner náboru nebo větší firemní kampaň."}</span>
            </div>
          </a>
        </div>
      </section>

      <main className="section">
        <div className="container grid">
          <aside className="filter-column">
            <SearchForm compact filters={filters} suggestions={suggestions} values={params} />
            <a className="side-ad jalovec-issue" href={sidebarAd?.targetUrl ?? issue.targetUrl ?? "https://www.jalovec.cz"} target="_blank" rel="noreferrer">
              <SmartImage alt={sidebarAd?.name ?? "Aktuální vydání týdeníku Jalovec"} className="side-ad-image" sizes="300px" src={sidebarAd?.creativeUrl ?? issue.coverImageUrl} />
              <Newspaper size={24} />
              <strong>{sidebarAd?.name ?? issue.title}</strong>
              <p>{sidebarAd?.note ?? issue.note ?? "Boční pozice pro týdeník, lokální firmu nebo sezónní náborovou kampaň."}</p>
            </a>
          </aside>
          <section>
            <div className="section-head jobs-head">
              <div>
                <span className="eyebrow">Výsledky hledání</span>
                <h2>{jobs.length > 0 ? `${jobs.length} aktivních nabídek` : "Nic jsme nenašli"}</h2>
              </div>
              <p>
                <Search size={16} /> Filtry se zapisují do URL, aby šel výsledek sdílet a měřit.
              </p>
            </div>
            <div className="cards job-grid">
              {jobs.map((job) => (
                <JobCard job={job} key={job.id} />
              ))}
              {jobs.length === 0 && (
                <div className="empty-marketing">
                  <span>0 výsledků</span>
                  <h2>Zkuste rozšířit lokalitu nebo ubrat filtr.</h2>
                  <p>Vyhledávání je teď oddělené od hlavní stránky, takže už neskáče dolů na homepage a drží čistou adresu pro kampaně.</p>
                  <Link className="button secondary" href="/jobs">
                    Zobrazit všechny nabídky
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
