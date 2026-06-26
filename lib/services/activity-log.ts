import { requireAdmin } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAdminActivity(action: string, entityType: string, entityId: string | null, summary: string) {
  const admin = await requireAdmin();
  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      actorType: "admin",
      actorEmail: admin.email,
      action,
      entityType,
      entityId,
      summary
    }
  });
}

export async function logClientActivity(
  client: { id: string; email: string; companyId: string },
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  metadata?: Prisma.InputJsonObject
) {
  await prisma.activityLog.create({
    data: {
      actorId: client.id,
      actorType: "client",
      actorEmail: client.email,
      companyId: client.companyId,
      action,
      entityType,
      entityId,
      summary,
      metadata: metadata ?? undefined
    }
  });
}

export async function logSystemActivity(action: string, entityType: string, entityId: string | null, summary: string) {
  await prisma.activityLog.create({
    data: {
      actorId: null,
      actorType: "system",
      actorEmail: "system",
      action,
      entityType,
      entityId,
      summary
    }
  });
}
