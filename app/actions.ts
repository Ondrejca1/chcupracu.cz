"use server";

import { addDays } from "date-fns";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdPlacementStatus, ApplicationStatus, JobStatus, PaymentStatus } from "@prisma/client";
import { login, logout, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

const required = z.string().trim().min(1, "Povinné pole");
const email = z.string().trim().email("Neplatný e-mail");
const optionalAssetUrl = z
  .string()
  .trim()
  .refine((value) => !value || value.startsWith("/") || URL.canParse(value), "Neplatná URL")
  .optional()
  .or(z.literal(""));

async function logAdminActivity(action: string, entityType: string, entityId: string | null, summary: string) {
  try {
    const admin = await requireAdmin();
    const activityLog = (prisma as unknown as {
      activityLog?: {
        create(args: {
          data: {
            actorId: string;
            actorEmail: string;
            action: string;
            entityType: string;
            entityId: string | null;
            summary: string;
          };
        }): Promise<unknown>;
      };
    }).activityLog;
    if (!activityLog) return;

    await activityLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        action,
        entityType,
        entityId,
        summary
      }
    });
  } catch (error) {
    console.error("Unable to write activity log.", error);
  }
}

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
  redirect("/admin/dashboard");
}

export async function adminLogout() {
  await logout();
  redirect("/admin");
}

export async function uploadAdminAsset(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Soubor se nepodařilo načíst." };
  if (file.size === 0) return { ok: false, message: "Soubor je prázdný." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Soubor může mít maximálně 5 MB." };

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
  if (!allowedTypes.has(file.type)) return { ok: false, message: "Povoleny jsou obrázky JPG, PNG, WebP, GIF nebo PDF." };

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf"
  };
  const originalName = file.name.replace(/\.[^.]+$/, "");
  const safeName = slugify(originalName || "soubor").slice(0, 70) || "soubor";
  const extension = extensionByType[file.type] ?? "bin";
  const directory = path.join(process.cwd(), "public", "uploads", "admin");
  try {
    await mkdir(directory, { recursive: true });
    const filename = `${safeName}-${Date.now().toString(36)}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(directory, filename), bytes);

    return { ok: true, message: "Soubor byl nahrán.", url: `/uploads/admin/${filename}` };
  } catch (error) {
    console.error("Unable to upload admin asset.", error);
    return { ok: false, message: "Nahrávání souborů není v tomto prostředí dostupné. Vložte prosím URL ručně." };
  }
}

export async function createPublicationIssue(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      title: required.max(140),
      issueNumber: z.string().trim().max(40).optional(),
      coverImageUrl: optionalAssetUrl,
      targetUrl: optionalAssetUrl,
      priceCzk: z.coerce.number().int().min(0).optional(),
      publishedAt: z.string().optional(),
      isCurrent: z.string().optional(),
      note: z.string().trim().max(500).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  try {
    const isCurrent = parsed.data.isCurrent === "on";
    const publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date();
    if (Number.isNaN(publishedAt.getTime())) return;

    if (isCurrent) await prisma.publicationIssue.updateMany({ data: { isCurrent: false } });

    const issue = await prisma.publicationIssue.create({
      data: {
        title: parsed.data.title,
        issueNumber: parsed.data.issueNumber || null,
        coverImageUrl: parsed.data.coverImageUrl || "/ads/jalovec-aktualni-vydani.jpg",
        targetUrl: parsed.data.targetUrl || "https://www.jalovec.cz",
        priceCzk: parsed.data.priceCzk || null,
        publishedAt,
        isCurrent,
        note: parsed.data.note || null
      }
    });
    await logAdminActivity("create", "publicationIssue", issue.id, `Přidáno vydání ${issue.title}.`);
  } catch (error) {
    console.error("Unable to create publication issue.", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jalovec");
  revalidatePath("/admin/dashboard");
}

export async function setCurrentPublicationIssue(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  try {
    await prisma.$transaction([
      prisma.publicationIssue.updateMany({ data: { isCurrent: false } }),
      prisma.publicationIssue.update({ where: { id }, data: { isCurrent: true } })
    ]);
    await logAdminActivity("setCurrent", "publicationIssue", id, "Změněno aktuální vydání Jalovce.");
  } catch (error) {
    console.error("Unable to set current publication issue.", error);
    return;
  }
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jalovec");
  revalidatePath("/admin/dashboard");
}

export async function createAdPlacement(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      name: required.max(120),
      placementKey: required.max(80),
      location: required.max(120),
      format: required.max(80),
      clientName: z.string().trim().max(120).optional(),
      creativeUrl: optionalAssetUrl,
      targetUrl: optionalAssetUrl,
      priceCzk: z.coerce.number().int().min(0),
      durationDays: z.coerce.number().int().min(1).max(365),
      availableSlots: z.coerce.number().int().min(0).max(20).optional(),
      status: z.nativeEnum(AdPlacementStatus),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      isFeatured: z.string().optional(),
      note: z.string().trim().max(700).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date();
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : addDays(startsAt, parsed.data.durationDays);

  try {
    const ad = await prisma.adPlacement.create({
      data: {
        name: parsed.data.name,
        placementKey: parsed.data.placementKey,
        location: parsed.data.location,
        format: parsed.data.format,
        clientName: parsed.data.clientName || null,
        creativeUrl: parsed.data.creativeUrl || null,
        targetUrl: parsed.data.targetUrl || null,
        priceCzk: parsed.data.priceCzk,
        durationDays: parsed.data.durationDays,
        availableSlots: parsed.data.availableSlots ?? 1,
        status: parsed.data.status,
        startsAt,
        endsAt,
        isFeatured: parsed.data.isFeatured === "on",
        note: parsed.data.note || null
      }
    });
    await logAdminActivity("create", "adPlacement", ad.id, `Vytvořena reklamní kampaň ${ad.name}.`);
  } catch (error) {
    console.error("Unable to create ad placement.", error);
    return;
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
}

export async function updateAdPlacementStatus(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: required, status: z.nativeEnum(AdPlacementStatus) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const ad = await prisma.adPlacement.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } }).catch((error) => {
    console.error("Unable to update ad placement status.", error);
    return null;
  });
  if (ad) await logAdminActivity("status", "adPlacement", ad.id, `Reklama ${ad.name} změněna na ${ad.status}.`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
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
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/applications");
  return { ok: true, message: "Odpověď jsme uložili. Redakce ji předá zaměstnavateli." };
}

export async function updateApplication(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: required,
      status: z.nativeEnum(ApplicationStatus),
      internalNote: z.string().trim().max(1200).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  let application: { id: string; name: string; status: ApplicationStatus; job: { title: string } };
  try {
    application = await prisma.application.update({
      where: { id: parsed.data.id },
      include: { job: true },
      data: {
        status: parsed.data.status,
        internalNote: parsed.data.internalNote || null
      }
    });
  } catch (error) {
    console.error("Unable to update application note, retrying status only.", error);
    application = await prisma.application.update({
      where: { id: parsed.data.id },
      include: { job: true },
      data: { status: parsed.data.status }
    });
  }
  await logAdminActivity("status", "application", application.id, `Reakce ${application.name} u inzerátu ${application.job.title} změněna na ${application.status}.`);

  revalidatePath("/admin/applications");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/jobs");
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
    await logAdminActivity("update", "jobPost", parsed.data.id, `Upraven inzerát ${parsed.data.title}.`);
  } else {
    const job = await prisma.jobPost.create({ data: { ...data, slug: `${baseSlug}-${Date.now().toString(36)}` } });
    jobId = job.id;
    await logAdminActivity("create", "jobPost", job.id, `Vytvořen inzerát ${job.title}.`);
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
  const job = await prisma.jobPost.update({
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
  await logAdminActivity("renew", "jobPost", job.id, `Obnoven/topován inzerát ${job.title}.`);
  revalidatePath("/");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
}

export async function expireJob(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const job = await prisma.jobPost.update({ where: { id }, data: { status: JobStatus.EXPIRED, activeUntil: new Date() } });
  await logAdminActivity("expire", "jobPost", job.id, `Skryt inzerát ${job.title}.`);
  revalidatePath("/");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
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
  revalidatePath("/admin/dictionaries");
}

const dictionaryType = z.enum(["city", "category", "education", "employmentType", "suitability"]);

export async function createDictionaryItem(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      type: dictionaryType,
      name: required.max(100),
      region: z.string().trim().max(80).optional(),
      sortOrder: z.coerce.number().int().min(0).max(9999).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const data = { name: parsed.data.name, slug: slugify(parsed.data.name), sortOrder: parsed.data.sortOrder ?? 100, isActive: true };
  if (parsed.data.type === "city") {
    await prisma.city.upsert({
      where: { slug: data.slug },
      update: { name: data.name, region: parsed.data.region || null, sortOrder: data.sortOrder, isActive: true },
      create: { ...data, region: parsed.data.region || null }
    });
  }
  if (parsed.data.type === "category") await prisma.category.upsert({ where: { slug: data.slug }, update: data, create: data });
  if (parsed.data.type === "education") await prisma.education.upsert({ where: { slug: data.slug }, update: data, create: data });
  if (parsed.data.type === "employmentType") await prisma.employmentType.upsert({ where: { slug: data.slug }, update: data, create: data });
  if (parsed.data.type === "suitability") await prisma.suitability.upsert({ where: { slug: data.slug }, update: data, create: data });

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/dictionaries");
}

export async function toggleDictionaryItem(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ type: dictionaryType, id: required, isActive: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = { isActive: parsed.data.isActive !== "true" };
  if (parsed.data.type === "city") await prisma.city.update({ where: { id: parsed.data.id }, data });
  if (parsed.data.type === "category") await prisma.category.update({ where: { id: parsed.data.id }, data });
  if (parsed.data.type === "education") await prisma.education.update({ where: { id: parsed.data.id }, data });
  if (parsed.data.type === "employmentType") await prisma.employmentType.update({ where: { id: parsed.data.id }, data });
  if (parsed.data.type === "suitability") await prisma.suitability.update({ where: { id: parsed.data.id }, data });

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/dictionaries");
}

export async function updateDictionaryItem(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      type: dictionaryType,
      id: required,
      name: required.max(100),
      region: z.string().trim().max(80).optional(),
      sortOrder: z.coerce.number().int().min(0).max(9999),
      isActive: z.string().optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const baseData = {
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive === "on"
  };

  if (parsed.data.type === "city") {
    await prisma.city.update({ where: { id: parsed.data.id }, data: { ...baseData, region: parsed.data.region || null } });
  }
  if (parsed.data.type === "category") await prisma.category.update({ where: { id: parsed.data.id }, data: baseData });
  if (parsed.data.type === "education") await prisma.education.update({ where: { id: parsed.data.id }, data: baseData });
  if (parsed.data.type === "employmentType") await prisma.employmentType.update({ where: { id: parsed.data.id }, data: baseData });
  if (parsed.data.type === "suitability") await prisma.suitability.update({ where: { id: parsed.data.id }, data: baseData });

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/dictionaries");
}

export async function toggleCity(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.city.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/");
  revalidatePath("/admin/dictionaries");
}

export async function createPackage(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      name: required.max(80),
      durationDays: z.coerce.number().int().min(1).max(365),
      priceCzk: z.coerce.number().int().min(0),
      description: z.string().trim().max(500).optional(),
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
      description: parsed.data.description || "Ruční evidence objednávky přes redakci."
    }
  });
  revalidatePath("/admin/packages");
}

export async function togglePackage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.pricingPackage.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/admin/packages");
}

export async function updatePackage(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: required,
      name: required.max(80),
      durationDays: z.coerce.number().int().min(1).max(365),
      priceCzk: z.coerce.number().int().min(0),
      description: z.string().trim().max(500).optional(),
      highlightColor: z.string().optional(),
      isTopPlacement: z.string().optional(),
      topDays: z.coerce.number().int().optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.pricingPackage.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      durationDays: parsed.data.durationDays,
      priceCzk: parsed.data.priceCzk,
      description: parsed.data.description || null,
      highlightColor: parsed.data.highlightColor || null,
      isTopPlacement: parsed.data.isTopPlacement === "on",
      topDays: parsed.data.topDays || null
    }
  });
  revalidatePath("/admin/packages");
}

export async function updateInvoiceStatus(formData: FormData) {
  await requireAdmin();
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
  await requireAdmin();
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
