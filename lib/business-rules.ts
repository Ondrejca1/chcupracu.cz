import { AdPlacementStatus, ApplicationStatus, ApplicationTag, JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const jobStatusLabels: Record<JobStatus, string> = {
  DRAFT: "Koncept",
  PENDING_PAYMENT: "Čeká na platbu",
  ACTIVE: "Aktivní",
  EXPIRED: "Expirovaný",
  ARCHIVED: "Archiv"
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  NEW: "Nová",
  CONTACTED: "Kontaktováno",
  WAITING: "Čeká",
  FORWARDED: "Předáno firmě",
  REJECTED: "Nevybráno",
  HIRED: "Obsazeno"
};

export const applicationTagLabels: Record<ApplicationTag, string> = {
  SUITABLE: "Vhodný",
  FORWARDED_TO_COMPANY: "Předáno firmě",
  WAITING: "Čeká",
  POSITION_FILLED: "Obsazeno"
};

export const adStatusLabels: Record<AdPlacementStatus, string> = {
  AVAILABLE: "Volné",
  RESERVED: "Rezervované",
  ACTIVE: "Aktivní",
  PAUSED: "Pozastavené",
  EXPIRED: "Ukončené"
};

export function activeJobWhere(now = new Date()): Prisma.JobPostWhereInput {
  return {
    status: JobStatus.ACTIVE,
    OR: [{ activeUntil: null }, { activeUntil: { gte: now } }]
  };
}

export function expiringJobWhere(now = new Date(), soon = new Date(now.getTime() + 7 * 86_400_000)): Prisma.JobPostWhereInput {
  return {
    status: JobStatus.ACTIVE,
    activeUntil: { gte: now, lte: soon }
  };
}

export function activeTopJobWhere(now = new Date()): Prisma.JobPostWhereInput {
  return {
    AND: [
      activeJobWhere(now),
      {
        isTop: true,
        OR: [{ topUntil: null }, { topUntil: { gte: now } }]
      }
    ]
  };
}

export function activeAdWhere(now = new Date(), placementKey?: string): Prisma.AdPlacementWhereInput {
  return {
    ...(placementKey ? { placementKey } : {}),
    status: AdPlacementStatus.ACTIVE,
    AND: [
      { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
    ]
  };
}

type SyncResult = {
  expiredJobs: number;
  expiredAds: number;
  expiredTopJobs: number;
  skipped?: boolean;
};

const SYNC_THROTTLE_MS = 60_000;
let lastBusinessStateSync = 0;
let businessStateSyncInFlight: Promise<SyncResult> | null = null;

export async function syncExpiredBusinessState(now = new Date(), options: { force?: boolean } = {}) {
  const currentTime = now.getTime();
  if (!options.force && currentTime - lastBusinessStateSync < SYNC_THROTTLE_MS) {
    return { expiredJobs: 0, expiredAds: 0, expiredTopJobs: 0, skipped: true };
  }
  if (businessStateSyncInFlight) return businessStateSyncInFlight;

  lastBusinessStateSync = currentTime;
  businessStateSyncInFlight = prisma
    .$transaction([
      prisma.jobPost.updateMany({
        where: { status: JobStatus.ACTIVE, activeUntil: { lt: now } },
        data: { status: JobStatus.EXPIRED }
      }),
      prisma.adPlacement.updateMany({
        where: { status: AdPlacementStatus.ACTIVE, endsAt: { lt: now } },
        data: { status: AdPlacementStatus.EXPIRED }
      }),
      prisma.jobPost.updateMany({
        where: { isTop: true, topUntil: { lt: now } },
        data: { isTop: false, topUntil: null }
      })
    ])
    .then(([expiredJobs, expiredAds, expiredTopJobs]) => ({
      expiredJobs: expiredJobs.count,
      expiredAds: expiredAds.count,
      expiredTopJobs: expiredTopJobs.count
    }))
    .finally(() => {
      businessStateSyncInFlight = null;
    });

  return businessStateSyncInFlight;
}
