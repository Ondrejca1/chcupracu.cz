"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PaymentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/services/activity-log";
import { required } from "@/lib/actions/shared";

export async function updateInvoiceStatus(formData: FormData) {
  await requirePermission("finance:write");
  const parsed = z.object({ id: required, status: z.nativeEnum(PaymentStatus) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const invoice = await prisma.invoice.update({
    where: { id: parsed.data.id },
    include: { company: true },
    data: { status: parsed.data.status, paidAt: parsed.data.status === PaymentStatus.PAID ? new Date() : null }
  });
  await logAdminActivity("status", "invoice", invoice.id, `Faktura firmy ${invoice.company.name} změněna na ${invoice.status}.`);
  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");
}

export async function createMissingInvoicesFromJobs() {
  await requirePermission("finance:write");
  const jobs = await prisma.jobPost.findMany({
    where: { packageId: { not: null }, invoices: { none: {} } },
    include: { package: true, company: true },
    take: 500
  });

  await prisma.invoice.createMany({
    data: jobs
      .filter((job) => job.package)
      .map((job) => ({
        companyId: job.companyId,
        jobId: job.id,
        packageId: job.package!.id,
        amountCzk: job.package!.priceCzk,
        status: PaymentStatus.UNPAID,
        issuedAt: job.createdAt,
        note: "Doplněno automaticky podle balíčku inzerátu."
      })),
    skipDuplicates: true
  });
  await logAdminActivity("repair", "invoice", null, `Doplněny chybějící faktury k ${jobs.length} inzerátům.`);

  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");
}
