import Link from "next/link";
import { ArrowRight, Building2, Newspaper, Sparkles } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { SearchForm } from "@/components/SearchForm";
import { getFilters, searchJobs, type JobSearchParams } from "@/lib/queries";

export default async function Home({ searchParams }: { searchParams: Promise<JobSearchParams> }) {
  const params = await searchParams;
  const [filters, jobs] = await Promise.all([getFilters(), searchJobs(params)]);

  return (
    <>
      <header className="site-header">
        <div className="bar">
          <Link className="logo" href="/">
            chcupracu.cz
          </Link>
          <nav className="nav">
            <Link href="/">Domů</Link>
            <Link href="#nabidky">Hledat práci</Link>
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
            <SearchForm filters={filters} />
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
          <Link href="/?category=remeslna-vyroba-a-manualni-prace#nabidky" className="quick-card">
            <Sparkles size={24} />
            <span>Nejžádanější</span>
            <strong>Práce ve výrobě</strong>
          </Link>
          <Link href="/?employment=brigada#nabidky" className="quick-card">
            <Sparkles size={24} />
            <span>Rychlý nástup</span>
            <strong>Brigády na Vsetíně</strong>
          </Link>
          <Link href="/?suitable=absolvent#nabidky" className="quick-card">
            <Sparkles size={24} />
            <span>Bez praxe</span>
            <strong>Pro absolventy</strong>
          </Link>
          <Link href="/?category=administrativa-zakaznicky-servis#nabidky" className="quick-card">
            <Sparkles size={24} />
            <span>Kancelář</span>
            <strong>Administrativa</strong>
          </Link>
        </div>
      </section>

      <section className="commercial-band">
        <div className="container commercial-grid">
          <div className="commercial-slot">
            <small>Hlavní reklamní pozice</small>
            <strong>Partner týdne: Valašské stavby nabírají</strong>
          </div>
          <div className="commercial-slot">
            <small>Top lokalita</small>
            <strong>Práce na Vsetíně</strong>
          </div>
          <div className="commercial-slot">
            <small>Top obor</small>
            <strong>Výroba a řemesla</strong>
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
            <Link href="#nabidky" className="text-link">
              Zobrazit nabídky <ArrowRight size={17} />
            </Link>
          </div>
          <div className="company-grid">
            <Link href="/?q=Valašské%20stavby#nabidky" className="company-tile dark">
              <Building2 size={24} />
              <span>Partner náboru</span>
              <strong>Valašské stavby</strong>
            </Link>
            <Link href="/?q=Automotive%20Rožnov#nabidky" className="company-tile light">
              <Building2 size={24} />
              <span>Výroba</span>
              <strong>Automotive Rožnov</strong>
            </Link>
            <Link href="/?q=Hotel%20Horal#nabidky" className="company-tile dark">
              <Building2 size={24} />
              <span>Cestovní ruch</span>
              <strong>Hotel Horal</strong>
            </Link>
            <Link href="/?q=Region%20servis#nabidky" className="company-tile light">
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
            <SearchForm compact filters={filters} />
            <div className="side-ad">
              <Newspaper size={24} />
              <strong>Aktuální vydání Jalovce</strong>
              <p>Ukázková boční reklamní pozice pro redakční obsah nebo lokální firmu.</p>
            </div>
          </aside>
          <section>
            <div className="section-head jobs-head">
              <div>
                <span className="eyebrow">Vybrané pracovní nabídky</span>
                <h2>{jobs.length > 0 ? `${jobs.length} aktivních nabídek` : "Nabídky už se připravují"}</h2>
              </div>
              <p>Mzdu můžete filtrovat, ale není nutná pro hlavní hledání.</p>
            </div>
            <div className="cards job-grid">
              {jobs.map((job) => (
                <JobCard job={job} key={job.id} />
              ))}
              {jobs.length === 0 && (
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
