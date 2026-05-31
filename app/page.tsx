import Link from "next/link";
import { ArrowRight, Building2, Newspaper, Sparkles } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { SearchForm } from "@/components/SearchForm";
import { money } from "@/lib/format";
import { getAdForSlot, getCurrentIssue, getFilters, getSearchSuggestions, searchJobs, type JobSearchParams } from "@/lib/queries";

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
  const [filters, jobs, suggestions, currentIssue, homepageAd, sidebarAd] = await Promise.all([
    getFilters(),
    searchJobs(params, 80, { homepageOnly: true }),
    getSearchSuggestions(),
    getCurrentIssue(),
    getAdForSlot("homepage_strip"),
    getAdForSlot("sidebar_box")
  ]);
  const homepageJobs = arrangeHomepageJobs(jobs);
  const issue = currentIssue ?? {
    title: "Týdeník Jalovec plus Sport Jalovec",
    coverImageUrl: "/ads/jalovec-aktualni-vydani.jpg",
    targetUrl: "https://www.jalovec.cz",
    note: "Ukázka velkého reklamního prostoru pro redakci nebo partnera týdne."
  };

  return (
    <>
      <header className="site-header">
        <div className="bar">
          <Link className="logo" href="/">
            chcupracu.cz
          </Link>
          <nav className="nav">
            <Link href="/">Domů</Link>
            <Link href="/jobs">Hledat práci</Link>
            <Link href="/admin/jobs/new">Zadat inzerát</Link>
            <Link href="/admin">Redakce</Link>
          </nav>
        </div>
      </header>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Lokální práce pro Vsetínsko</span>
            <h1>Práce na Vsetíně a okolí bez zbytečného hledání</h1>
            <p>Moderní regionální pracovní portál propojený s redakcí. Vsetín, Rožnov, Velké Karlovice, Brumov-Bylnice a další okolní města na jednom místě.</p>
            <SearchForm filters={filters} suggestions={suggestions} values={params} />
          </div>
          <aside className="hero-promo" aria-label="Ukázková reklamní pozice">
            <span>Inzerce</span>
            <h2>Hledáte lidi na Valašsku?</h2>
            <p>Prémiový banner pro lokální firmu, náborovou kampaň nebo aktuální vydání týdeníku Jalovec.</p>
            <div className="promo-badges">
              <strong>Web + tisk</strong>
              <strong>Top pozice</strong>
              <strong>Grafika</strong>
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
            <img alt="Aktuální vydání týdeníku Jalovec" src={issue.coverImageUrl} />
            <div>
              <small>Aktuální vydání Jalovce</small>
              <strong>{issue.title}</strong>
              <span>{issue.note ?? "Redakční prostor pro aktuální vydání nebo partnera týdne."}</span>
            </div>
          </a>
          <a className="commercial-slot" href={homepageAd?.targetUrl ?? "/jobs"} target={homepageAd?.targetUrl ? "_blank" : undefined} rel={homepageAd?.targetUrl ? "noreferrer" : undefined}>
            <small>{homepageAd?.location ?? "Hlavní reklamní pozice"}</small>
            <strong>{homepageAd?.name ?? "Partner týdne: volná pozice"}</strong>
            <span>{homepageAd ? `${money(homepageAd.priceCzk)} / ${homepageAd.durationDays} dní` : "Volná pozice pro lokální náborovou kampaň"}</span>
          </a>
          <div className="commercial-slot">
            <small>Top lokalita</small>
            <strong>Práce na Vsetíně</strong>
            <span>Prodejní pozice pro místní zaměstnavatele</span>
          </div>
          <div className="commercial-slot">
            <small>Top obor</small>
            <strong>Výroba a řemesla</strong>
            <span>Tematický blok pro sezónní kampaně</span>
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
            <Link href="/jobs?q=Valašské%20stavby" className="company-tile dark">
              <Building2 size={24} />
              <span>Partner náboru</span>
              <strong>Valašské stavby</strong>
            </Link>
            <Link href="/jobs?q=Automotive%20Rožnov" className="company-tile light">
              <Building2 size={24} />
              <span>Výroba</span>
              <strong>Automotive Rožnov</strong>
            </Link>
            <Link href="/jobs?q=Hotel%20Horal" className="company-tile dark">
              <Building2 size={24} />
              <span>Cestovní ruch</span>
              <strong>Hotel Horal</strong>
            </Link>
            <Link href="/jobs?q=Region%20servis" className="company-tile light">
              <Building2 size={24} />
              <span>Obchod</span>
              <strong>Region servis</strong>
            </Link>
          </div>
        </div>
      </section>

      <main className="section">
        <div className="container grid" id="nabidky">
          <aside className="filter-column">
            <SearchForm compact filters={filters} suggestions={suggestions} values={params} />
            <a className="side-ad jalovec-issue" href={sidebarAd?.targetUrl ?? issue.targetUrl ?? "https://www.jalovec.cz"} target="_blank" rel="noreferrer">
              <img alt={sidebarAd?.name ?? "Aktuální vydání týdeníku Jalovec"} src={sidebarAd?.creativeUrl ?? issue.coverImageUrl} />
              <Newspaper size={24} />
              <strong>{sidebarAd?.name ?? issue.title}</strong>
              <p>{sidebarAd?.note ?? issue.note ?? "Konkrétní reklamní blok pro týdeník, který může redakce pravidelně měnit."}</p>
            </a>
          </aside>
          <section>
            <div className="section-head jobs-head">
              <div>
                <span className="eyebrow">Vybrané pracovní nabídky</span>
                <h2>{homepageJobs.length > 0 ? `${homepageJobs.length} aktivních nabídek` : "Nabídky už se připravují"}</h2>
              </div>
              <p>Mzdu můžete filtrovat, ale není nutná pro hlavní hledání.</p>
            </div>
            <div className="cards job-grid">
              {homepageJobs.map(({ job, wide }) => (
                <JobCard job={job} key={job.id} wide={wide} />
              ))}
              {homepageJobs.length === 0 && (
                <div className="empty-marketing">
                  <span>0 aktivních nabídek</span>
                  <h2>Zatím čekáme na první ostré inzeráty.</h2>
                  <p>Struktura webu, filtry a redakční administrace jsou připravené. Jakmile se na Vercelu spustí seed nebo redakce vloží první nabídky, zobrazí se tady v profesionálním výpisu.</p>
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
