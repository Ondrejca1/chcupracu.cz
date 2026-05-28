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

const activeJobWhere = () => ({
  status: JobStatus.ACTIVE,
  OR: [{ activeUntil: null }, { activeUntil: { gte: new Date() } }]
});

export async function getFilters() {
  const [cities, categories, educations, employmentTypes, suitabilities] = await Promise.all([
    prisma.city.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.education.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.employmentType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.suitability.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } })
  ]);
  return { cities, categories, educations, employmentTypes, suitabilities };
}

export async function getSearchSuggestions() {
  const [jobs, companies, categories] = await Promise.all([
    prisma.jobPost.findMany({
      where: activeJobWhere(),
      orderBy: [{ isTop: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }],
      select: { title: true },
      take: 60
    }),
    prisma.company.findMany({
      where: { jobs: { some: activeJobWhere() } },
      orderBy: { name: "asc" },
      select: { name: true },
      take: 40
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { name: true },
      take: 40
    })
  ]);

  return Array.from(new Set([...jobs.map((job) => job.title), ...companies.map((company) => company.name), ...categories.map((category) => category.name)])).slice(0, 100);
}

export async function searchJobs(params: JobSearchParams, limit = 40) {
  const salaryMin = Number(params.salaryMin);
  const salaryMax = Number(params.salaryMax);
  const where: Prisma.JobPostWhereInput = activeJobWhere();

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
    orderBy: [{ isTop: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), 80)
  });
}

export async function getSimilarJobs(job: { id: string; cityId: string; categoryId: string }) {
  return prisma.jobPost.findMany({
    where: {
      id: { not: job.id },
      AND: [
        activeJobWhere(),
        { OR: [{ categoryId: job.categoryId }, { cityId: job.cityId }] }
      ]
    },
    include: {
      company: true,
      city: true,
      category: true,
      education: true,
      employmentType: true,
      suitabilities: { include: { suitability: true } }
    },
    orderBy: [{ isTop: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }],
    take: 3
  });
}
