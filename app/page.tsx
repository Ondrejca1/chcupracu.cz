import Link from "next/link";
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
            <Link href="/admin">Redakce</Link>
          </nav>
        </div>
      </header>
      <section className="hero">
        <div className="hero-inner">
          <h1>Práce na Vsetíně a okolí bez zbytečného hledání</h1>
          <p>Lokální nabídky pro Vsetín, Rožnov, Velké Karlovice, Brumov-Bylnici a další místa, která redakce jednoduše přidá v administraci.</p>
          <SearchForm filters={filters} />
        </div>
      </section>
      <main className="section">
        <div className="container grid">
          <aside>
            <SearchForm compact filters={filters} />
          </aside>
          <section>
            <div className="meta" style={{ justifyContent: "space-between", marginBottom: 14 }}>
              <strong>{jobs.length} aktivních nabídek</strong>
              <span>Mzdu můžete filtrovat, ale není nutná pro hlavní hledání.</span>
            </div>
            <div className="cards">
              {jobs.map((job) => (
                <JobCard job={job} key={job.id} />
              ))}
              {jobs.length === 0 && (
                <div className="card">
                  <h2>Zatím tu nic nesedí.</h2>
                  <p>Zkuste rozšířit lokalitu nebo odebrat některý filtr.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
