import Link from "next/link";
import { Briefcase, MapPin } from "lucide-react";
import { salaryRange } from "@/lib/format";

type JobCardProps = {
  job: {
    slug: string;
    title: string;
    shortIntro: string;
    salaryMinCzk?: number | null;
    salaryMaxCzk?: number | null;
    company: { name: string };
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
  return (
    <article className={`card job-card ${wide ? "job-card-wide" : ""} ${showImage ? "job-card-with-image" : ""}`} style={{ background: job.highlightColor ?? undefined }}>
      {showImage && (
        <div className="job-card-image" style={{ backgroundImage: `url(${job.previewImageUrl})` }}>
          {job.isTop && <span className="tag top-tag">Topováno</span>}
        </div>
      )}
      <div className="job-card-body">
        {!showImage && job.isTop && <span className="tag top-tag">Topováno</span>}
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
          <strong>{job.company.name}</strong>
          {job.showSalaryInPreview !== false && <span>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</span>}
        </div>
      </div>
    </article>
  );
}
