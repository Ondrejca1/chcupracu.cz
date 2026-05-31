"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { JobStatus } from "@prisma/client";
import { login, logout, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const required = z.string().trim().min(1, "Povinné pole");
const email = z.string().trim().email("Neplatný e-mail");

export async function adminLogin(_: unknown, formData: FormData) {
  const parsed = z.object({ email, password: required }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Vyplňte prosím e-mail a heslo." };
  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    const configMessage =
      result.reason === "config_missing"
        ? "Administrace není dokončená. Na Vercelu chybí proměnná SESSION_SECRET pro aktuální prostředí."
        : "Administrace není dokončená. SESSION_SECRET na Vercelu musí mít alespoň 32 znaků.";

    return {
      ok: false,
      message: result.reason === "invalid" ? "Přihlášení se nepovedlo." : configMessage
    };
  }
  redirect("/admin/jobs");
}

export async function adminLogout() {
  await logout();
  redirect("/admin");
}

export async function createApplication(_: unknown, formData: FormData) {
  const parsed = z
    .object({
      jobId: required,
      slug: required,
      name: required.max(120),
      email,
      phone: z.string().trim().max(40).optional(),
      message: required.max(2000),
      consentGdpr: z.literal("on")
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { ok: false, message: "Zkontrolujte prosím formulář a souhlas se zpracováním údajů." };
  }

  const job = await prisma.jobPost.findFirst({
    where: { id: parsed.data.jobId, status: JobStatus.ACTIVE }
  });
  if (!job) return { ok: false, message: "Tato nabídka už není aktivní." };

  await prisma.application.create({
    data: {
      jobId: parsed.data.jobId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      consentGdpr: true
    }
  });

  revalidatePath(`/jobs/${parsed.data.slug}`);
  return { ok: true, message: "Odpověď jsme uložili. Redakce ji předá zaměstnavateli." };
}

export async function upsertJob(formData: FormData) {
  await requireAdmin();
  const raw = Object.fromEntries(formData);
  const suitabilityIds = formData.getAll("suitabilityIds").map(String);
  const parsed = z
    .object({
      id: z.string().optional(),
      title: required.max(160),
      companyName: required.max(160),
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
      durationDays: z.coerce.number().int().min(1).max(365),
      status: z.nativeEnum(JobStatus)
    })
    .safeParse(raw);

  if (!parsed.success) return { ok: false, message: "Inzerát nejde uložit. Zkontrolujte povinná pole." };

  const companySlug = slugify(parsed.data.companyName);
  const company = await prisma.company.upsert({
    where: { slug: companySlug },
    update: { name: parsed.data.companyName },
    create: { name: parsed.data.companyName, slug: companySlug }
  });

  const baseSlug = slugify(parsed.data.title);
  const activeFrom = parsed.data.status === JobStatus.ACTIVE ? new Date() : null;
  const activeUntil = parsed.data.status === JobStatus.ACTIVE ? addDays(new Date(), parsed.data.durationDays) : null;
  const selectedPackage = parsed.data.packageId ? await prisma.pricingPackage.findUnique({ where: { id: parsed.data.packageId } }) : null;
  const topDays = parsed.data.topDays || selectedPackage?.topDays || 0;
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
    isTop: Boolean(topDays),
    topUntil: topDays ? addDays(new Date(), topDays) : null,
    status: parsed.data.status,
    activeFrom,
    activeUntil,
    renewedAt: activeFrom,
    companyId: company.id,
    cityId: parsed.data.cityId,
    categoryId: parsed.data.categoryId,
    educationId: parsed.data.educationId || null,
    employmentTypeId: parsed.data.employmentTypeId,
    packageId: parsed.data.packageId || null
  };

  let jobId = parsed.data.id;
  if (parsed.data.id) {
    await prisma.jobPost.update({ where: { id: parsed.data.id }, data });
    await prisma.jobSuitability.deleteMany({ where: { jobId: parsed.data.id } });
  } else {
    const job = await prisma.jobPost.create({ data: { ...data, slug: `${baseSlug}-${Date.now().toString(36)}` } });
    jobId = job.id;
    if (parsed.data.packageId) {
      if (selectedPackage) {
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
  }

  if (jobId && suitabilityIds.length > 0) {
    await prisma.jobSuitability.createMany({
      data: suitabilityIds.map((suitabilityId) => ({ jobId: jobId!, suitabilityId })),
      skipDuplicates: true
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs");
}

export async function renewJob(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const days = Number(formData.get("days") ?? 30);
  const topDays = Number(formData.get("topDays") ?? 0);
  const highlightColor = String(formData.get("highlightColor") ?? "");
  await prisma.jobPost.update({
    where: { id },
    data: {
      status: JobStatus.ACTIVE,
      activeFrom: new Date(),
      activeUntil: addDays(new Date(), Math.min(Math.max(days, 1), 365)),
      renewedAt: new Date(),
      isTop: topDays > 0,
      topUntil: topDays > 0 ? addDays(new Date(), Math.min(Math.max(topDays, 1), 365)) : null,
      highlightColor: highlightColor || null
    }
  });
  revalidatePath("/");
  revalidatePath("/admin/jobs");
}

export async function expireJob(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await prisma.jobPost.update({ where: { id }, data: { status: JobStatus.EXPIRED, activeUntil: new Date() } });
  revalidatePath("/");
  revalidatePath("/admin/jobs");
}

export async function createCity(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ name: required.max(80), region: z.string().max(80).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.city.upsert({
    where: { slug: slugify(parsed.data.name) },
    update: { name: parsed.data.name, region: parsed.data.region || null, isActive: true },
    create: { name: parsed.data.name, slug: slugify(parsed.data.name), region: parsed.data.region || null }
  });
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function toggleCity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.city.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/");
  revalidatePath("/admin/settings");
}

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      name: required.max(80),
      durationDays: z.coerce.number().int().min(1).max(365),
      priceCzk: z.coerce.number().int().min(0),
      highlightColor: z.string().optional(),
      isTopPlacement: z.string().optional(),
      topDays: z.coerce.number().int().optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.pricingPackage.create({
    data: {
      name: parsed.data.name,
      durationDays: parsed.data.durationDays,
      priceCzk: parsed.data.priceCzk,
      highlightColor: parsed.data.highlightColor || null,
      isTopPlacement: parsed.data.isTopPlacement === "on",
      topDays: parsed.data.topDays || null,
      description: "Ruční evidence objednávky přes redakci."
    }
  });
  revalidatePath("/admin/settings");
}

export async function togglePackage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.pricingPackage.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/admin/settings");
}
