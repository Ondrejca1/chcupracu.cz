import { Prisma } from "@prisma/client";
import { activeAdWhere, activeJobWhere } from "@/lib/business-rules";
import { prisma } from "@/lib/prisma";

export type JobSearchParams = {
  q?: string | string[];
  city?: string | string[];
  category?: string | string[];
  education?: string | string[];
  employment?: string | string[];
  suitable?: string | string[];
  salaryMin?: string | string[];
  salaryMax?: string | string[];
  sort?: string | string[];
};

const firstParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

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

export async function getCurrentIssue() {
  try {
    return await prisma.publicationIssue.findFirst({
      where: { isCurrent: true },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        issueNumber: true,
        publishedAt: true,
        coverImageUrl: true,
        targetUrl: true,
        priceCzk: true,
        isCurrent: true,
        note: true
      }
    });
  } catch (error) {
    console.error("Unable to load current publication issue.", error);
    return null;
  }
}

export async function getFeaturedAds(limit = 4) {
  try {
    const now = new Date();
    return await prisma.adPlacement.findMany({
      where: activeAdWhere(now),
      orderBy: [{ isFeatured: "desc" }, { startsAt: "desc" }, { createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 8)
    });
  } catch (error) {
    console.error("Unable to load featured ads.", error);
    return [];
  }
}

export async function getAdForSlot(placementKey: string) {
  try {
    const now = new Date();
    return await prisma.adPlacement.findFirst({
      where: activeAdWhere(now, placementKey),
      orderBy: [{ isFeatured: "desc" }, { startsAt: "desc" }, { createdAt: "desc" }]
    });
  } catch (error) {
    console.error(`Unable to load ad slot ${placementKey}.`, error);
    return null;
  }
}

export async function getFeaturedCompanies(limit = 4) {
  return prisma.company.findMany({
    where: { jobs: { some: activeJobWhere() } },
    select: {
      id: true,
      name: true,
      slug: true,
      brandColor: true,
      _count: { select: { jobs: { where: activeJobWhere() } } }
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 8)
  });
}

export async function getJobVisibilityCounts() {
  const now = new Date();
  const [active, homepage] = await Promise.all([
    prisma.jobPost.count({ where: activeJobWhere(now) }),
    prisma.jobPost.count({ where: { ...activeJobWhere(now), showOnHomepage: true } })
  ]);

  return { active, homepage };
}

export async function searchJobs(params: JobSearchParams, limit = 40, options: { homepageOnly?: boolean } = {}) {
  const q = firstParam(params.q)?.trim();
  const city = firstParam(params.city);
  const category = firstParam(params.category);
  const education = firstParam(params.education);
  const employment = firstParam(params.employment);
  const suitable = firstParam(params.suitable);
  const salaryMin = Number(firstParam(params.salaryMin));
  const salaryMax = Number(firstParam(params.salaryMax));
  const sort = firstParam(params.sort);
  const where: Prisma.JobPostWhereInput = activeJobWhere();

  if (options.homepageOnly) where.showOnHomepage = true;

  if (q) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { shortIntro: { contains: q, mode: "insensitive" } },
          { company: { name: { contains: q, mode: "insensitive" } } }
        ]
      }
    ];
  }
  if (city) where.city = { is: { slug: city } };
  if (category) where.category = { is: { slug: category } };
  if (education) where.education = { is: { slug: education } };
  if (employment) where.employmentType = { is: { slug: employment } };
  if (suitable) where.suitabilities = { some: { suitability: { is: { slug: suitable } } } };
  if (!Number.isNaN(salaryMin) && salaryMin > 0) where.salaryMaxCzk = { gte: salaryMin };
  if (!Number.isNaN(salaryMax) && salaryMax > 0) where.salaryMinCzk = { lte: salaryMax };

  const orderBy: Prisma.JobPostOrderByWithRelationInput[] =
    sort === "salary"
      ? [{ salaryMaxCzk: "desc" }, { salaryMinCzk: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }]
      : sort === "newest"
        ? [{ renewedAt: "desc" }, { createdAt: "desc" }]
        : [{ isTop: "desc" }, { renewedAt: "desc" }, { createdAt: "desc" }];

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
    orderBy,
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
