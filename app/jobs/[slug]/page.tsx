import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/ApplicationForm";
import { dateCs, salaryRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function JobDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await prisma.jobPost.update({
    where: { slug },
    data: { views: { increment: 1 } },
    include: {
      company: true,
      city: true,
      category: true,
      education: true,
      employmentType: true,
      suitabilities: { include: { suitability: true } }
    }
  }).catch(() => null);

  if (!job || job.status !== "ACTIVE" || (job.activeUntil && job.activeUntil < new Date())) notFound();

  return (
    <>
      <header className="site-header">
        <div className="bar">
          <Link className="logo" href="/">
            chcupracu.cz
          </Link>
          <Link className="button secondary" href="/">
            Zpět na nabídky
          </Link>
        </div>
      </header>
      <main className="section">
        <div className="container detail">
          <article className="card">
            <div className="meta">
              <span>{job.city.name}</span>
              <span>{job.category.name}</span>
              <span>{job.employmentType.name}</span>
            </div>
            <h1>{job.title}</h1>
            <p>
              <strong>{job.company.name}</strong> · {salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}
            </p>
            <p>{job.shortIntro}</p>
            <h2>Náplň práce</h2>
            <p>{job.description}</p>
            {job.requirements && (
              <>
                <h2>Požadavky</h2>
                <p>{job.requirements}</p>
              </>
            )}
            {job.benefits && (
              <>
                <h2>Benefity</h2>
                <p>{job.benefits}</p>
              </>
            )}
            <div className="meta">
              {job.education && <span className="tag">{job.education.name}</span>}
              {job.suitabilities.map((item) => (
                <span className="tag" key={item.suitabilityId}>
                  {item.suitability.name}
                </span>
              ))}
            </div>
            <p className="meta">Aktivní do {dateCs(job.activeUntil)}</p>
          </article>
          <aside>
            <ApplicationForm jobId={job.id} slug={job.slug} />
          </aside>
        </div>
      </main>
    </>
  );
}
