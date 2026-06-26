"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { JobReviewStatus, JobSource, JobStatus } from "@prisma/client";
import { requireClient } from "@/lib/client-auth";
import { optionalAssetUrl, required } from "@/lib/actions/shared";
import { prisma } from "@/lib/prisma";
import { logClientActivity } from "@/lib/services/activity-log";
import { escapeHtml, sendTransactionalEmail } from "@/lib/services/email";
import { slugify } from "@/lib/slug";

const optionalInt = z.preprocess((value) => (value === "" || value == null ? undefined : value), z.coerce.number().int().min(0).optional());

const clientJobSchema = z.object({
  id: z.string().optional(),
  intent: z.enum(["draft", "submit"]),
  title: required.max(160),
  cityId: required,
  categoryId: required,
  educationId: z.string().optional(),
  employmentTypeId: required,
  packageId: z.string().optional(),
  shortIntro: required.max(240),
  description: required.max(8000),
  requirements: z.string().trim().max(4000).optional(),
  benefits: z.string().trim().max(4000).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional(),
  previewImageUrl: optionalAssetUrl,
  detailImageUrl: optionalAssetUrl,
  flyerUrl: optionalAssetUrl,
  showSalaryInPreview: z.string().optional(),
  salaryMinCzk: optionalInt,
  salaryMaxCzk: optionalInt,
  clientNote: z.string().trim().max(1200).optional()
});

async function ensureEditableClientJob(jobId: string, companyId: string) {
  const job = await prisma.jobPost.findFirst({
    where: { id: jobId, companyId, source: JobSource.CLIENT },
    include: { reviewComments: { orderBy: { createdAt: "desc" }, take: 1 } }
  });
  if (!job) return null;
  if (job.reviewStatus !== JobReviewStatus.DRAFT && job.reviewStatus !== JobReviewStatus.CHANGES_REQUESTED && job.reviewStatus !== JobReviewStatus.REJECTED) {
    return null;
  }
  return job;
}

export async function saveClientJob(formData: FormData) {
  const client = await requireClient();
  const raw = Object.fromEntries(formData);
  const suitabilityIds = formData.getAll("suitabilityIds").map(String);
  const parsed = clientJobSchema.safeParse(raw);
  if (!parsed.success) redirect("/klient/inzeraty/novy?error=form");

  if (parsed.data.salaryMinCzk && parsed.data.salaryMaxCzk && parsed.data.salaryMaxCzk < parsed.data.salaryMinCzk) {
    redirect(parsed.data.id ? `/klient/inzeraty/${parsed.data.id}/upravit?error=salary` : "/klient/inzeraty/novy?error=salary");
  }

  if (parsed.data.packageId) {
    const selectedPackage = await prisma.pricingPackage.findFirst({ where: { id: parsed.data.packageId, isActive: true } });
    if (!selectedPackage) redirect(parsed.data.id ? `/klient/inzeraty/${parsed.data.id}/upravit?error=package` : "/klient/inzeraty/novy?error=package");
  }

  const reviewStatus = parsed.data.intent === "submit" ? JobReviewStatus.SUBMITTED : JobReviewStatus.DRAFT;
  const status = JobStatus.DRAFT;
  const data = {
    title: parsed.data.title,
    shortIntro: parsed.data.shortIntro,
    description: parsed.data.description,
    requirements: parsed.data.requirements || null,
    benefits: parsed.data.benefits || null,
    contactEmail: parsed.data.contactEmail || client.email,
    contactPhone: parsed.data.contactPhone || client.phone || null,
    previewImageUrl: parsed.data.previewImageUrl || null,
    detailImageUrl: parsed.data.detailImageUrl || null,
    flyerUrl: parsed.data.flyerUrl || null,
    showSalaryInPreview: parsed.data.showSalaryInPreview === "on",
    salaryMinCzk: parsed.data.salaryMinCzk ?? null,
    salaryMaxCzk: parsed.data.salaryMaxCzk ?? null,
    status,
    source: JobSource.CLIENT,
    reviewStatus,
    reviewNote: reviewStatus === JobReviewStatus.SUBMITTED ? null : undefined,
    submittedAt: reviewStatus === JobReviewStatus.SUBMITTED ? new Date() : undefined,
    submittedByClientId: client.id,
    companyId: client.companyId,
    cityId: parsed.data.cityId,
    categoryId: parsed.data.categoryId,
    educationId: parsed.data.educationId || null,
    employmentTypeId: parsed.data.employmentTypeId,
    packageId: parsed.data.packageId || null
  };

  let jobId = parsed.data.id;
  if (parsed.data.id) {
    const existing = await ensureEditableClientJob(parsed.data.id, client.companyId);
    if (!existing) redirect("/klient/inzeraty?error=locked");
    await prisma.jobPost.update({ where: { id: existing.id }, data });
    await prisma.jobSuitability.deleteMany({ where: { jobId: existing.id } });
    jobId = existing.id;
  } else {
    const job = await prisma.jobPost.create({
      data: {
        ...data,
        slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`
      }
    });
    jobId = job.id;
  }

  if (jobId && suitabilityIds.length > 0) {
    await prisma.jobSuitability.createMany({
      data: suitabilityIds.map((suitabilityId) => ({ jobId: jobId!, suitabilityId })),
      skipDuplicates: true
    });
  }

  if (jobId && parsed.data.clientNote) {
    await prisma.jobReviewComment.create({
      data: {
        jobId,
        authorType: "client",
        authorEmail: client.email,
        message: parsed.data.clientNote
      }
    });
  }

  await logClientActivity(
    client,
    parsed.data.intent === "submit" ? "submit" : "draft",
    "jobPost",
    jobId ?? null,
    parsed.data.intent === "submit" ? `Klient odeslal inzerát ${parsed.data.title} ke schválení.` : `Klient uložil koncept inzerátu ${parsed.data.title}.`
  );

  if (parsed.data.intent === "submit") {
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (adminEmail) {
      await sendTransactionalEmail({
        to: adminEmail,
        replyTo: client.email,
        subject: `Nový inzerát ke schválení: ${parsed.data.title}`,
        html: `<p>Firma <strong>${escapeHtml(client.company.name)}</strong> odeslala inzerát ke schválení.</p><p><strong>${escapeHtml(parsed.data.title)}</strong></p><p>Kontakt: ${escapeHtml(client.name)} · ${escapeHtml(client.email)}</p>`
      });
    }
  }

  revalidatePath("/klient");
  revalidatePath("/klient/inzeraty");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/tasks");
  redirect(`/klient/inzeraty/${jobId}?notice=${parsed.data.intent === "submit" ? "submitted" : "saved"}`);
}
