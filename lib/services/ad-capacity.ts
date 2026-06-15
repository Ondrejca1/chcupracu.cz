import { AdPlacementStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function checkAdSlotCapacity(placementKey: string, startsAt: Date, endsAt: Date, availableSlots: number, ignoredId?: string) {
  const overlapping = await prisma.adPlacement.count({
    where: {
      placementKey,
      id: ignoredId ? { not: ignoredId } : undefined,
      status: { in: [AdPlacementStatus.RESERVED, AdPlacementStatus.ACTIVE] },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: endsAt } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: startsAt } }] }
      ]
    }
  });

  return overlapping < Math.max(availableSlots, 1);
}
