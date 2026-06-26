import { AdPlacementStatus, JobReviewStatus, JobSource, JobStatus, PaymentStatus } from "@prisma/client";
import { addDays } from "date-fns";
import { activeAdWhere, activeJobWhere, expiringJobWhere, syncExpiredBusinessState } from "@/lib/business-rules";
import { prisma } from "@/lib/prisma";

export async function getOperationalWarnings() {
  await syncExpiredBusinessState();
  const now = new Date();
  const soon = addDays(now, 7);

  const [expiringJobs, activeWithoutInvoice, paidButInactive, adsWithoutCreative, clientReviewJobs, activeAds, activeJobs] = await Promise.all([
    prisma.jobPost.findMany({
      where: expiringJobWhere(now, soon),
      select: { id: true, title: true, slug: true, activeUntil: true, company: { select: { name: true } } },
      orderBy: { activeUntil: "asc" },
      take: 12
    }),
    prisma.jobPost.findMany({
      where: { ...activeJobWhere(now), invoices: { none: {} } },
      select: { id: true, title: true, slug: true, company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.invoice.findMany({
      where: {
        status: PaymentStatus.PAID,
        job: {
          is: {
            OR: [{ status: { not: JobStatus.ACTIVE } }, { activeUntil: { lt: now } }]
          }
        }
      },
      select: {
        id: true,
        amountCzk: true,
        job: { select: { id: true, title: true, slug: true, status: true, activeUntil: true } },
        company: { select: { name: true } }
      },
      orderBy: { paidAt: "desc" },
      take: 12
    }),
    prisma.adPlacement.findMany({
      where: {
        status: { in: [AdPlacementStatus.RESERVED, AdPlacementStatus.ACTIVE] },
        OR: [{ creativeUrl: null }, { creativeUrl: "" }]
      },
      select: { id: true, name: true, placementKey: true, clientName: true, status: true, startsAt: true, endsAt: true },
      orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
      take: 12
    }),
    prisma.jobPost.findMany({
      where: { source: JobSource.CLIENT, reviewStatus: { in: [JobReviewStatus.SUBMITTED, JobReviewStatus.IN_REVIEW] } },
      select: {
        id: true,
        title: true,
        submittedAt: true,
        reviewStatus: true,
        company: { select: { name: true } },
        submittedByClient: { select: { email: true, name: true } }
      },
      orderBy: [{ submittedAt: "asc" }, { updatedAt: "asc" }],
      take: 12
    }),
    prisma.adPlacement.count({ where: activeAdWhere(now) }),
    prisma.jobPost.count({ where: activeJobWhere(now) })
  ]);

  return {
    expiringJobs,
    activeWithoutInvoice,
    paidButInactive,
    adsWithoutCreative,
    clientReviewJobs,
    counts: {
      expiringJobs: expiringJobs.length,
      activeWithoutInvoice: activeWithoutInvoice.length,
      paidButInactive: paidButInactive.length,
      adsWithoutCreative: adsWithoutCreative.length,
      clientReviewJobs: clientReviewJobs.length,
      activeAds,
      activeJobs
    }
  };
}
