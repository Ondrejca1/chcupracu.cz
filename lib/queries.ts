import { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type JobSearchParams = {
  q?: string;
  city?: string;
  category?: string;
  education?: string;
  employment?: string;
  suitable?: string;
  salaryMin?: string;
  salaryMax?: string;
};

export async function getFilters() {
  const [cities, categories, educations, employmentTypes, suitabilities] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.education.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.employmentType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.suitability.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })
  ]);
  return { cities, categories, educations, employmentTypes, suitabilities };
}

export async function searchJobs(params: JobSearchParams) {
  const now = new Date();
  const salaryMin = Number(params.salaryMin);
  const salaryMax = Number(params.salaryMax);
  const where: Prisma.JobPostWhereInput = {
    status: JobStatus.ACTIVE,
    OR: [{ activeUntil: null }, { activeUntil: { gte: now } }]
  };

  if (params.q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { title: { contains: params.q, mode: "insensitive" } },
          { shortIntro: { contains: params.q, mode: "insensitive" } },
          { company: { name: { contains: params.q, mode: "insensitive" } } }
        ]
      }
    ];
  }
  if (params.city) where.city = { slug: params.city };
  if (params.category) where.category = { slug: params.category };
  if (params.education) where.education = { slug: params.education };
  if (params.employment) where.employmentType = { slug: params.employment };
  if (params.suitable) where.suitabilities = { some: { suitability: { slug: params.suitable } } };
  if (!Number.isNaN(salaryMin) && salaryMin > 0) where.salaryMaxCzk = { gte: salaryMin };
  if (!Number.isNaN(salaryMax) && salaryMax > 0) where.salaryMinCzk = { lte: salaryMax };

  return prisma.jobPost.findMany({
    where,
    include: {
      company: true,
      city: true,
      category: true,
      education: true,
      employmentType: true,
      suitabilities: { include: { suitability: true } }
    },
    orderBy: [{ isTop: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }]
  });
}
