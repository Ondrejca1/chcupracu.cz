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
  };
};

export function JobCard({ job }: JobCardProps) {
  return (
    <article className="card" style={{ background: job.highlightColor ?? undefined, borderColor: job.isTop ? "#f59e0b" : undefined }}>
      {job.isTop && <span className="tag">Topováno</span>}
      <div className="meta">
        <span>
          <MapPin size={14} /> {job.city.name}
        </span>
        <span>
          <Briefcase size={14} /> {job.employmentType.name}
        </span>
        <span>{job.category.name}</span>
      </div>
      <h2>
        <Link href={`/jobs/${job.slug}`}>{job.title}</Link>
      </h2>
      <p>{job.shortIntro}</p>
      <div className="meta">
        <strong>{job.company.name}</strong>
        <span>{salaryRange(job.salaryMinCzk, job.salaryMaxCzk)}</span>
      </div>
    </article>
  );
}
