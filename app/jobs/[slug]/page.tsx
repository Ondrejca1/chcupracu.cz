import { Suspense, type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, CalendarDays, FileText, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { ApplicationForm } from "@/components/ApplicationForm";
import { JobCard } from "@/components/JobCard";
import { JobViewTracker } from "@/components/JobViewTracker";
import { SiteHeader } from "@/components/SiteHeader";
import { SmartImage } from "@/components/SmartImage";
import { dateCs, salaryRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getAdForSlot, getSimilarJobs } from "@/lib/queries";
import { activeJobWhere, syncExpiredBusinessState } from "@/lib/business-rules";

export default async function JobDetail({ params }: { params: Promise<{ slug: string }> }) {
  await syncExpiredBusinessState();
  const { slug } = await params;
  const job = await prisma.jobPost.findFirst({
    where: { slug, ...activeJobWhere() },
    include: {
      company: true,
      city: true,
      category: true,
      education: true,
      employmentType: true,
      suitabilities: { include: { suitability: true } }
    }
  });

  if (!job) notFound();

  const companyColor = job.company.brandColor || job.highlightColor || "#e00909";
  const heroImage = job.detailImageUrl || job.previewImageUrl || "/preview-assets/hero-workers.png";
  const detailAd = await getAdForSlot("job_detail_sidebar");

  return (
    <>
      <JobViewTracker slug={job.slug} />
      <SiteHeader />
      <main className="detail-page-shell" style={{ "--company-color": companyColor } as CSSProperties}>
        <section className="container detail-hero">
          <div>
            <div className="breadcrumb">
              <Link href="/">Domů</Link> / <Link href="/jobs">Nabídky práce</Link> / <span>{job.title}</span>
            </div>
            {job.isTop && <span className="tag top-tag">Top nabídka</span>}
            <h1>{job.title}</h1>
            <p className="detail-lead">{job.shortIntro}</p>
            <div className="detail-company-line">
              <span className="company-logo">{job.company.name.slice(0, 2).toUpperCase()}</span>
              <div>
                <Link href={`/firmy/${job.company.slug}`}>{job.company.name}</Link>
                <div className="meta">Ověřená regionální firma · {job.city.name}</div>
              </div>
            </div>
            <div className="meta">
              <span className="job-chip"><MapPin size={14} /> {job.city.name}</span>
              <span className="job-chip"><Briefcase size={14} /> {job.employmentType.name}</span>
              <span className="job-chip">{job.category.name}</span>
              {job.education && <span className="job-chip">{job.education.name}</span>}
            </div>
            <div className="detail-highlight">
              <div><span>Mzda</span><strong>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</strong></div>
              <div><span>Nástup</span><strong>Ihned / dohodou</strong></div>
              <div><span>Aktivní do</span><strong>{dateCs(job.activeUntil)}</strong></div>
            </div>
          </div>
          <div className="detail-media">
            <div className="company-photo" style={{ backgroundImage: `linear-gradient(180deg, transparent 44%, rgba(17,24,39,.72)), url(${heroImage})` }}>
              <strong>{job.title} · {job.company.name}</strong>
            </div>
            <a className="flyer-card" href={job.flyerUrl || "#kontakt"}>
              <small>Náborový letáček</small>
              <strong>{job.flyerUrl ? "Otevřít firemní leták / PDF" : "Prostor pro firemní leták, PDF nebo grafiku kampaně"}</strong>
              <span>V administraci lze přidat URL letáku nebo kampaně.</span>
            </a>
          </div>
        </section>

        <section className="detail-layout" id="kontakt">
          <div>
            <div className="detail-grid">
              <article className="detail-panel-card">
                <h2>Náplň práce</h2>
                <p>{job.description}</p>
              </article>
              <article className="detail-panel-card">
                <h2>Co očekáváme</h2>
                <p>{job.requirements || "Spolehlivost, pečlivost a chuť pracovat v regionu."}</p>
              </article>
              <article className="detail-panel-card">
                <h2>Co nabízíme</h2>
                <p>{job.benefits || "Férové jednání, lokální práci a nástup dle dohody."}</p>
              </article>
              <article className="detail-panel-card">
                <h2>Informace o firmě</h2>
                <p>{job.company.note || `${job.company.name} působí v regionu a hledá nové kolegy do svého týmu. Detail nabídky může nést firemní barvy, logo, fotku, leták i vlastní kontaktní nastavení.`}</p>
                <div className="meta">
                  <span className="job-chip">Ověřená firma</span>
                  <span className="job-chip">{job.city.name}</span>
                  <span className="job-chip">{job.views} zobrazení</span>
                </div>
              </article>
            </div>
            <section className="detail-panel-card detail-brand-card">
              <h2>Firemní brand a média</h2>
              <p>Nabídka je připravená pro logo, firemní barvy, hlavní fotku, náborový leták i prémiové zvýraznění ve výpisu. Základní balíček může mít fotku až po rozkliknutí, topované nabídky i rovnou v přehledu.</p>
              <div className="meta">
                <span className="job-chip">Firemní barva</span>
                <span className="job-chip">Foto detailu</span>
                <span className="job-chip">Leták / PDF</span>
                <span className="job-chip">Topování</span>
              </div>
            </section>

            <section className="similar-section">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Podobné nabídky</span>
                  <h2>Další práce, které dávají smysl</h2>
                </div>
              </div>
              <Suspense fallback={null}>
                <SimilarJobs job={{ id: job.id, cityId: job.cityId, categoryId: job.categoryId }} />
              </Suspense>
            </section>
          </div>

          <aside className="apply-panel">
            <h2>Mám zájem o pozici</h2>
            <p className="meta">Odpověď odejde redakci nebo firmě podle nastavení konkrétního inzerátu.</p>
            <div className="contact-box">
              <strong>Kontaktní údaje</strong>
              <span><Mail size={15} /> {job.contactEmail || job.company.email || "prace@chcupracu.cz"}</span>
              <span><Phone size={15} /> {job.contactPhone || job.company.phone || "+420 777 000 000"}</span>
              <span><CalendarDays size={15} /> Aktivní do {dateCs(job.activeUntil)}</span>
              <span><FileText size={15} /> {job.company.contactName || "Redakce chcupracu.cz"}</span>
            </div>
            <ApplicationForm jobId={job.id} slug={job.slug} />
            <div className="apply-note">
              <Sparkles size={18} />
              <span>V ostré verzi půjde nastavit formulář, telefon, e-mail nebo externí odkaz na kariérní stránku firmy.</span>
            </div>
            {detailAd && (
              <a className="detail-ad-card" href={detailAd.targetUrl ?? "#"} target={detailAd.targetUrl ? "_blank" : undefined} rel={detailAd.targetUrl ? "noreferrer" : undefined}>
                {detailAd.creativeUrl && <SmartImage alt={detailAd.name} className="detail-ad-image" sizes="360px" src={detailAd.creativeUrl} />}
                <small>Reklamní partner</small>
                <strong>{detailAd.name}</strong>
                <span>{detailAd.note ?? detailAd.location}</span>
              </a>
            )}
          </aside>
        </section>
        <a className="mobile-apply-cta" href="#kontakt">Odpovědět na nabídku</a>
      </main>
    </>
  );
}

async function SimilarJobs({ job }: { job: { id: string; cityId: string; categoryId: string } }) {
  const similarJobs = await getSimilarJobs(job);

  return (
    <div className="cards job-grid">
      {similarJobs.map((item) => (
        <JobCard job={item} key={item.id} />
      ))}
      {similarJobs.length === 0 && <p className="meta">Podobné nabídky se zobrazí po přidání dalších aktivních inzerátů.</p>}
    </div>
  );
}
