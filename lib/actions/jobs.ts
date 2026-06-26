"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { JobReviewStatus, JobSource, JobStatus, PaymentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/services/activity-log";
import { optionalAssetUrl, parseOptionalDate, required } from "@/lib/actions/shared";
import { slugify } from "@/lib/slug";

export async function upsertJob(formData: FormData) {
  const admin = await requirePermission("jobs:write");
  const raw = Object.fromEntries(formData);
  const suitabilityIds = formData.getAll("suitabilityIds").map(String);
  const parsed = z
    .object({
      id: z.string().optional(),
      title: required.max(160),
      companyName: required.max(160),
      companyLogoUrl: optionalAssetUrl,
      companyBrandColor: z
        .string()
        .trim()
        .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Neplatná brand barva")
        .optional()
        .or(z.literal("")),
      cityId: required,
      categoryId: required,
      educationId: z.string().optional(),
      employmentTypeId: required,
      packageId: z.string().optional(),
      shortIntro: required.max(240),
      description: required,
      requirements: z.string().optional(),
      benefits: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      contactPhone: z.string().optional(),
      previewImageUrl: z.string().trim().optional(),
      detailImageUrl: z.string().trim().optional(),
      flyerUrl: z.string().trim().optional(),
      showImageInList: z.string().optional(),
      showSalaryInPreview: z.string().optional(),
      showOnHomepage: z.string().optional(),
      salaryMinCzk: z.coerce.number().int().optional(),
      salaryMaxCzk: z.coerce.number().int().optional(),
      highlightColor: z.string().optional(),
      topDays: z.coerce.number().int().optional(),
      topUntil: z.string().trim().optional(),
      durationDays: z.coerce.number().int().min(1).max(365),
      createdAt: z.string().trim().optional(),
      activeFrom: z.string().trim().optional(),
      activeUntil: z.string().trim().optional(),
      renewedAt: z.string().trim().optional(),
      status: z.nativeEnum(JobStatus)
    })
    .safeParse(raw);

  if (!parsed.success) return { ok: false, message: "Inzerát nejde uložit. Zkontrolujte povinná pole." };

  const companySlug = slugify(parsed.data.companyName);
  const companyBranding = {
    ...(parsed.data.companyLogoUrl ? { logoUrl: parsed.data.companyLogoUrl } : {}),
    ...(parsed.data.companyBrandColor ? { brandColor: parsed.data.companyBrandColor } : {})
  };
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: { name: parsed.data.companyName, ...companyBranding },
    create: {
      name: parsed.data.companyName,
      slug: companySlug,
      logoUrl: parsed.data.companyLogoUrl || null,
      brandColor: parsed.data.companyBrandColor || null
    }
  });

  const existingJob = parsed.data.id ? await prisma.jobPost.findUnique({ where: { id: parsed.data.id } }) : null;
  const baseSlug = slugify(parsed.data.title);
  const now = new Date();
  const createdAtInput = parseOptionalDate(parsed.data.createdAt);
  const activeFromInput = parseOptionalDate(parsed.data.activeFrom);
  const activeUntilInput = parseOptionalDate(parsed.data.activeUntil);
  const renewedAtInput = parseOptionalDate(parsed.data.renewedAt);
  const topUntilInput = parseOptionalDate(parsed.data.topUntil);
  if ([createdAtInput, activeFromInput, activeUntilInput, renewedAtInput, topUntilInput].some((value) => value === undefined)) {
    return { ok: false, message: "Inzerát nejde uložit. Zkontrolujte datumy." };
  }
  if (activeFromInput && activeUntilInput && activeUntilInput < activeFromInput) {
    return { ok: false, message: "Inzerát nejde uložit. Datum ukončení je před začátkem." };
  }
  const activeFrom =
    parsed.data.status === JobStatus.ACTIVE
      ? activeFromInput ?? existingJob?.activeFrom ?? now
      : activeFromInput;
  const activeUntil =
    parsed.data.status === JobStatus.ACTIVE
      ? activeUntilInput ?? addDays(activeFrom ?? now, parsed.data.durationDays)
      : parsed.data.status === JobStatus.EXPIRED
        ? activeUntilInput ?? now
        : activeUntilInput;
  const renewedAt =
    parsed.data.status === JobStatus.ACTIVE
      ? renewedAtInput ?? existingJob?.renewedAt ?? now
      : renewedAtInput;
  const selectedPackage = parsed.data.packageId ? await prisma.pricingPackage.findUnique({ where: { id: parsed.data.packageId } }) : null;
  const topDays = parsed.data.topDays || (!existingJob ? selectedPackage?.topDays : 0) || 0;
  const topUntil = topUntilInput ?? (topDays ? addDays(renewedAt ?? now, topDays) : null);
  const reviewData =
    existingJob && existingJob.source === JobSource.CLIENT && (parsed.data.status === JobStatus.ACTIVE || parsed.data.status === JobStatus.PENDING_PAYMENT)
      ? { reviewStatus: JobReviewStatus.APPROVED, reviewedAt: now, reviewedByAdminId: admin.id }
      : existingJob
        ? {}
        : { source: JobSource.ADMIN, reviewStatus: JobReviewStatus.APPROVED, reviewedAt: now, reviewedByAdminId: admin.id };
  const data = {
    title: parsed.data.title,
    shortIntro: parsed.data.shortIntro,
    description: parsed.data.description,
    requirements: parsed.data.requirements || null,
    benefits: parsed.data.benefits || null,
    contactEmail: parsed.data.contactEmail || null,
    contactPhone: parsed.data.contactPhone || null,
    previewImageUrl: parsed.data.previewImageUrl || null,
    detailImageUrl: parsed.data.detailImageUrl || null,
    flyerUrl: parsed.data.flyerUrl || null,
    showImageInList: parsed.data.showImageInList === "on",
    showSalaryInPreview: parsed.data.showSalaryInPreview === "on",
    showOnHomepage: parsed.data.showOnHomepage === "on",
    salaryMinCzk: parsed.data.salaryMinCzk || null,
    salaryMaxCzk: parsed.data.salaryMaxCzk || null,
    highlightColor: parsed.data.highlightColor || selectedPackage?.highlightColor || null,
    isTop: Boolean(topUntil && topUntil > now),
    topUntil,
    status: parsed.data.status,
    activeFrom,
    activeUntil,
    renewedAt,
    ...(createdAtInput ? { createdAt: createdAtInput } : {}),
    companyId: company.id,
    cityId: parsed.data.cityId,
    categoryId: parsed.data.categoryId,
    educationId: parsed.data.educationId || null,
    employmentTypeId: parsed.data.employmentTypeId,
    packageId: parsed.data.packageId || null,
    ...reviewData
  };

  let jobId = parsed.data.id;
  if (parsed.data.id) {
    await prisma.jobPost.update({ where: { id: parsed.data.id }, data });
    await prisma.jobSuitability.deleteMany({ where: { jobId: parsed.data.id } });
    await logAdminActivity("update", "jobPost", parsed.data.id, `Upraven inzerát ${parsed.data.title}.`);
  } else {
    const job = await prisma.jobPost.create({ data: { ...data, slug: `${baseSlug}-${Date.now().toString(36)}` } });
    jobId = job.id;
    await logAdminActivity("create", "jobPost", job.id, `Vytvořen inzerát ${job.title}.`);
    if (parsed.data.packageId && selectedPackage) {
      await prisma.invoice.create({
        data: {
          companyId: company.id,
          jobId: job.id,
          packageId: selectedPackage.id,
          amountCzk: selectedPackage.priceCzk,
          status: "UNPAID",
          note: "Ruční evidence objednávky přes redakci."
        }
      });
    }
  }

  if (jobId && suitabilityIds.length > 0) {
    await prisma.jobSuitability.createMany({
      data: suitabilityIds.map((suitabilityId) => ({ jobId: jobId!, suitabilityId })),
      skipDuplicates: true
    });
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  if (existingJob) revalidatePath(`/jobs/${existingJob.slug}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
  redirect("/admin/jobs?notice=saved");
}

export async function renewJob(formData: FormData) {
  const admin = await requirePermission("jobs:write");
  const id = String(formData.get("id"));
  const packageId = String(formData.get("packageId") ?? "");
  const selectedPackage = packageId ? await prisma.pricingPackage.findUnique({ where: { id: packageId } }) : null;
  const days = selectedPackage?.durationDays ?? Number(formData.get("days") ?? 30);
  const topDays = selectedPackage?.isTopPlacement ? selectedPackage.topDays ?? 0 : Number(formData.get("topDays") ?? 0);
  const highlightColor = selectedPackage?.highlightColor ?? String(formData.get("highlightColor") ?? "");
  const job = await prisma.jobPost.update({
    where: { id },
    include: { company: true },
    data: {
      status: JobStatus.ACTIVE,
      activeFrom: new Date(),
      activeUntil: addDays(new Date(), Math.min(Math.max(days, 1), 365)),
      renewedAt: new Date(),
      isTop: topDays > 0,
      topUntil: topDays > 0 ? addDays(new Date(), Math.min(Math.max(topDays, 1), 365)) : null,
      highlightColor: highlightColor || null,
      packageId: selectedPackage?.id ?? undefined,
      reviewStatus: JobReviewStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedByAdminId: admin.id
    }
  });
  if (selectedPackage) {
    await prisma.invoice.create({
      data: {
        companyId: job.companyId,
        jobId: job.id,
        packageId: selectedPackage.id,
        amountCzk: selectedPackage.priceCzk,
        status: PaymentStatus.UNPAID,
        note: "Obnova inzerátu podle vybraného balíčku."
      }
    });
  }
  await logAdminActivity("renew", "jobPost", job.id, `Obnoven/topován inzerát ${job.title}.`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
  redirect("/admin/jobs?notice=status");
}

export async function expireJob(formData: FormData) {
  await requirePermission("jobs:write");
  const id = String(formData.get("id"));
  const job = await prisma.jobPost.update({ where: { id }, data: { status: JobStatus.EXPIRED, activeUntil: new Date() } });
  await logAdminActivity("expire", "jobPost", job.id, `Skryt inzerát ${job.title}.`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
  redirect("/admin/jobs?notice=status");
}
