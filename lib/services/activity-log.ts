import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function logAdminActivity(action: string, entityType: string, entityId: string | null, summary: string) {
  const admin = await requireAdmin();
  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      action,
      entityType,
      entityId,
      summary
    }
  });
}

export async function logSystemActivity(action: string, entityType: string, entityId: string | null, summary: string) {
  await prisma.activityLog.create({
    data: {
      actorId: null,
      actorEmail: "system",
      action,
      entityType,
      entityId,
      summary
    }
  });
}
