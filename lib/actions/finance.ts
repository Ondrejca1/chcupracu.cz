"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { JobReviewStatus, JobStatus, PaymentStatus } from "@prisma/client";
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
    include: { company: true, package: true, job: { include: { package: true } } },
    data: { status: parsed.data.status, paidAt: parsed.data.status === PaymentStatus.PAID ? new Date() : null }
  });
  await logAdminActivity("status", "invoice", invoice.id, `Faktura firmy ${invoice.company.name} změněna na ${invoice.status}.`);

  if (
    parsed.data.status === PaymentStatus.PAID &&
    invoice.job &&
    invoice.job.status === JobStatus.PENDING_PAYMENT &&
    invoice.job.reviewStatus === JobReviewStatus.APPROVED
  ) {
    const now = new Date();
    const selectedPackage = invoice.job.package ?? invoice.package;
    const topDays = selectedPackage?.isTopPlacement ? selectedPackage.topDays ?? 0 : 0;
    await prisma.jobPost.update({
      where: { id: invoice.job.id },
      data: {
        status: JobStatus.ACTIVE,
        activeFrom: now,
        activeUntil: addDays(now, selectedPackage?.durationDays ?? 30),
        renewedAt: now,
        isTop: topDays > 0,
        topUntil: topDays > 0 ? addDays(now, topDays) : null,
        highlightColor: invoice.job.highlightColor || selectedPackage?.highlightColor || null
      }
    });
    await logAdminActivity("publish", "jobPost", invoice.job.id, `Schválený inzerát ${invoice.job.title} publikován po zaplacení faktury.`);
    revalidatePath("/");
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${invoice.job.slug}`);
    revalidatePath("/admin/jobs");
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/dashboard");
  revalidatePath("/klient");
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
