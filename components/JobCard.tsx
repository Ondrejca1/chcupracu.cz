import type { CSSProperties } from "react";
import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";
import { SmartImage } from "@/components/SmartImage";
import { salaryRange } from "@/lib/format";

type JobCardProps = {
  job: {
    slug: string;
    title: string;
    shortIntro: string;
    salaryMinCzk?: number | null;
    salaryMaxCzk?: number | null;
    company: { name: string; slug?: string; logoUrl?: string | null; brandColor?: string | null };
    city: { name: string };
    category: { name: string };
    employmentType: { name: string };
    isTop?: boolean;
    highlightColor?: string | null;
    previewImageUrl?: string | null;
    showImageInList?: boolean;
    showSalaryInPreview?: boolean;
  };
  wide?: boolean;
};

export function JobCard({ job, wide = false }: JobCardProps) {
  const showImage = Boolean(job.showImageInList && job.previewImageUrl);
  const initials = job.company.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const cardStyle = {
    "--company-brand": job.company.brandColor ?? job.highlightColor ?? "#c81e1e",
    "--job-highlight": job.highlightColor ?? "var(--surface)"
  } as CSSProperties;

  return (
    <article className={`card job-card ${wide ? "job-card-wide" : ""} ${showImage ? "job-card-with-image" : ""}`} style={cardStyle}>
      <div className="job-card-brand-bar">
        {showImage ? (
          <SmartImage alt={`Náhled nabídky ${job.title}`} className="job-card-brand-image" sizes={wide ? "(max-width: 900px) 100vw, 820px" : "(max-width: 900px) 100vw, 440px"} src={job.previewImageUrl!} />
        ) : (
          <div className="job-card-brand-fill" />
        )}
        <div className="job-card-brand-overlay">
          <span className="job-card-company-mark" aria-hidden="true">
            {job.company.logoUrl ? <SmartImage alt="" className="job-card-logo" sizes="48px" src={job.company.logoUrl} /> : initials}
          </span>
          <span className="job-card-company-text">
            <small>{job.company.name}</small>
            <strong>Regionální zaměstnavatel</strong>
          </span>
          {job.isTop && <span className="tag top-tag">Topováno</span>}
        </div>
      </div>
      <div className="job-card-body">
        <div className="meta">
          <span className="job-chip">
            <MapPin size={14} /> {job.city.name}
          </span>
          <span className="job-chip">
            <Briefcase size={14} /> {job.employmentType.name}
          </span>
          <span className="job-chip">{job.category.name}</span>
        </div>
        <h2>
          <Link href={`/jobs/${job.slug}`}>{job.title}</Link>
        </h2>
        <p>{job.shortIntro}</p>
        <div className="meta job-card-foot">
          {job.company.slug ? <Link href={`/firmy/${job.company.slug}`}>{job.company.name}</Link> : <strong>{job.company.name}</strong>}
          {job.showSalaryInPreview !== false && <span>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</span>}
        </div>
      </div>
    </article>
  );
}
