import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Mail, Phone } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { SiteHeader } from "@/components/SiteHeader";
import { SmartImage } from "@/components/SmartImage";
import { activeJobWhere, syncExpiredBusinessState } from "@/lib/business-rules";
import { prisma } from "@/lib/prisma";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  await syncExpiredBusinessState();
  const { slug } = await params;
  const now = new Date();
  const company = await prisma.company.findUnique({
    where: { slug },
    include: {
      jobs: {
        where: activeJobWhere(now),
        include: {
          company: true,
          city: true,
          category: true,
          education: true,
          employmentType: true,
          suitabilities: { include: { suitability: true } }
        },
        orderBy: [{ isTop: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }]
      }
    }
  });

  if (!company) notFound();

  return (
    <>
      <SiteHeader />
      <main className="company-page" style={{ "--company-color": company.brandColor ?? "#c81e1e" } as CSSProperties}>
        <section className="container company-hero">
          <div className="company-logo large">
            {company.logoUrl ? <SmartImage alt={`Logo ${company.name}`} className="company-logo-image" sizes="82px" src={company.logoUrl} /> : company.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="eyebrow">Profil firmy</span>
            <h1>{company.name}</h1>
            <p>{company.note ?? "Regionální zaměstnavatel s aktuálními pracovními nabídkami na chcupracu.cz."}</p>
            <div className="meta">
              {company.email && <a className="job-chip" href={`mailto:${company.email}`}><Mail size={14} /> {company.email}</a>}
              {company.phone && <a className="job-chip" href={`tel:${company.phone}`}><Phone size={14} /> {company.phone}</a>}
              {company.address && <span className="job-chip"><Building2 size={14} /> {company.address}</span>}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="eyebrow">Aktuální nabídky</span>
                <h2>{company.jobs.length ? `${company.jobs.length} pozic u firmy ${company.name}` : "Firma teď nemá aktivní nabídky"}</h2>
              </div>
              <Link className="text-link" href="/jobs">Všechny nabídky</Link>
            </div>
            <div className="cards job-grid">
              {company.jobs.map((job) => <JobCard job={job} key={job.id} />)}
              {company.jobs.length === 0 && (
                <div className="empty-marketing">
                  <span>Bez aktivních pozic</span>
                  <h2>Mrkněte na další nabídky v regionu.</h2>
                  <p>Jakmile firma zveřejní novou pracovní nabídku, objeví se automaticky tady.</p>
                  <Link className="button secondary" href="/jobs">Zobrazit nabídky</Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
