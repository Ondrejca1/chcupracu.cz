"use server";

import { addDays } from "date-fns";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdPlacementStatus, ApplicationStatus, ApplicationTag, JobStatus, PaymentStatus } from "@prisma/client";
import { login, logout, requireAdmin } from "@/lib/auth";
import { activeAdWhere, activeJobWhere, syncExpiredBusinessState } from "@/lib/business-rules";
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

async function logSystemActivity(action: string, entityType: string, entityId: string | null, summary: string) {
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

async function sendTransactionalEmail(input: { to: string; subject: string; html: string; replyTo?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "Chci práci <noreply@chcupracu.cz>";
  if (!apiKey) return { ok: false, skipped: true };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo
    })
  });

  if (!response.ok) {
    console.error("Unable to send transactional email.", await response.text());
    return { ok: false, skipped: false };
  }

  return { ok: true, skipped: false };
}

async function checkAdSlotCapacity(placementKey: string, startsAt: Date, endsAt: Date, availableSlots: number, ignoredId?: string) {
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

function withActionResult(path: string, key: "notice" | "error", value: string) {
  const url = new URL(path, "https://admin.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function markPublicationIssueCurrent(id: string) {
  try {
    await prisma.$transaction([
      prisma.publicationIssue.updateMany({ data: { isCurrent: false } }),
      prisma.publicationIssue.update({ where: { id }, data: { isCurrent: true } })
    ]);
    return true;
  } catch (error) {
    console.error("Unable to set current publication issue with transaction, retrying single update.", error);
    try {
      await prisma.publicationIssue.update({ where: { id }, data: { isCurrent: true } });
      return true;
    } catch (retryError) {
      console.error("Unable to set current publication issue.", retryError);
      return false;
    }
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
  if (!parsed.success) redirect("/admin/jalovec?error=invalid");

  const isCurrent = parsed.data.isCurrent === "on";
  const publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date();
  if (Number.isNaN(publishedAt.getTime())) redirect("/admin/jalovec?error=date");

  let target = "/admin/jalovec?notice=created";
  try {
    const issue = await prisma.publicationIssue.create({
      data: {
        title: parsed.data.title,
        issueNumber: parsed.data.issueNumber || null,
        coverImageUrl: parsed.data.coverImageUrl || "/ads/jalovec-aktualni-vydani.jpg",
        targetUrl: parsed.data.targetUrl || "https://www.jalovec.cz",
        priceCzk: parsed.data.priceCzk || null,
        publishedAt,
        isCurrent: false,
        note: parsed.data.note || null
      }
    });
    if (isCurrent) {
      const currentOk = await markPublicationIssueCurrent(issue.id);
      target = currentOk ? "/admin/jalovec?notice=created-current" : "/admin/jalovec?notice=created-not-current";
    }
    await logAdminActivity("create", "publicationIssue", issue.id, `Přidáno vydání ${issue.title}.`);
  } catch (error) {
    console.error("Unable to create publication issue.", error);
    redirect("/admin/jalovec?error=create");
  }

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jalovec");
  revalidatePath("/admin/dashboard");
  redirect(target);
}

export async function setCurrentPublicationIssue(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const currentOk = await markPublicationIssueCurrent(id);
  if (currentOk) await logAdminActivity("setCurrent", "publicationIssue", id, "Změněno aktuální vydání Jalovce.");
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jalovec");
  revalidatePath("/admin/dashboard");
  redirect(currentOk ? "/admin/jalovec?notice=current" : "/admin/jalovec?error=current");
}

export async function createAdPlacement(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      name: required.max(120),
      placementKey: required.max(80),
      productType: z.enum(["PAID_AD", "JALOVEC", "PARTNER_OF_WEEK"]).optional(),
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
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt < startsAt) {
    redirect(`/admin/ads?slot=${parsed.data.placementKey}&error=date#new-ad`);
  }

  const checksCapacity = parsed.data.status === AdPlacementStatus.RESERVED || parsed.data.status === AdPlacementStatus.ACTIVE;
  if (checksCapacity) {
    const hasCapacity = await checkAdSlotCapacity(parsed.data.placementKey, startsAt, endsAt, parsed.data.availableSlots ?? 1);
    if (!hasCapacity) redirect(`/admin/ads?slot=${parsed.data.placementKey}&error=slot-full#new-ad`);
  }

  try {
    const ad = await prisma.adPlacement.create({
      data: {
        name: parsed.data.name,
        placementKey: parsed.data.placementKey,
        productType: parsed.data.productType ?? "PAID_AD",
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
  redirect(`/admin/ads?slot=${parsed.data.placementKey}&notice=created`);
}

export async function updateAdPlacementStatus(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: required, status: z.nativeEnum(AdPlacementStatus) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const existing = await prisma.adPlacement.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return;
  if (
    parsed.data.status === AdPlacementStatus.ACTIVE &&
    existing.startsAt &&
    existing.endsAt &&
    !(await checkAdSlotCapacity(existing.placementKey, existing.startsAt, existing.endsAt, existing.availableSlots, existing.id))
  ) {
    redirect(`/admin/ads?slot=${existing.placementKey}&error=slot-full`);
  }
  const ad = await prisma.adPlacement.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  if (ad) await logAdminActivity("status", "adPlacement", ad.id, `Reklama ${ad.name} změněna na ${ad.status}.`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/ads?slot=${ad.placementKey}&notice=status`);
}

export async function createApplication(_: unknown, formData: FormData) {
  await syncExpiredBusinessState();
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
    where: { id: parsed.data.jobId, ...activeJobWhere() },
    include: { company: true }
  });
  if (!job) return { ok: false, message: "Tato nabídka už není aktivní." };

  const application = await prisma.application.create({
    data: {
      jobId: parsed.data.jobId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      consentGdpr: true,
      communications: {
        create: {
          channel: "form",
          direction: "inbound",
          subject: `Reakce na inzerát ${job.title}`,
          body: parsed.data.message,
          actorEmail: parsed.data.email
        }
      }
    }
  });
  await logSystemActivity("create", "application", application.id, `Nová reakce od ${application.name} na inzerát ${job.title}.`);

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendTransactionalEmail({
      to: adminEmail,
      replyTo: parsed.data.email,
      subject: `Nová reakce: ${job.title}`,
      html: `<p><strong>${parsed.data.name}</strong> odpověděl/a na inzerát <strong>${job.title}</strong>.</p><p>${parsed.data.message}</p><p>E-mail: ${parsed.data.email}<br>Telefon: ${parsed.data.phone ?? "-"}</p>`
    });
  }

  const companyEmail = job.contactEmail || job.company.email;
  if (companyEmail && process.env.AUTO_NOTIFY_COMPANY === "true") {
    await sendTransactionalEmail({
      to: companyEmail,
      replyTo: parsed.data.email,
      subject: `Nová reakce z chcupracu.cz: ${job.title}`,
      html: `<p>Dobrý den, přišla nová reakce na pozici <strong>${job.title}</strong>.</p><p><strong>${parsed.data.name}</strong><br>${parsed.data.email}<br>${parsed.data.phone ?? ""}</p><p>${parsed.data.message}</p>`
    });
  }

  revalidatePath(`/jobs/${parsed.data.slug}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/applications");
  return { ok: true, message: "Odpověď jsme uložili. Redakce ji předá zaměstnavateli." };
}

export async function updateApplication(formData: FormData) {
  await requireAdmin();
  const tagValues = formData
    .getAll("tags")
    .map(String)
    .filter((value): value is ApplicationTag => Object.values(ApplicationTag).includes(value as ApplicationTag));
  const parsed = z
    .object({
      id: required,
      status: z.nativeEnum(ApplicationStatus),
      internalNote: z.string().trim().max(1200).optional(),
      communicationBody: z.string().trim().max(2000).optional(),
      communicationChannel: z.string().trim().max(40).optional(),
      returnTo: z.string().trim().startsWith("/").optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  let application: { id: string; name: string; status: ApplicationStatus; job: { title: string } };
  application = await prisma.application.update({
    where: { id: parsed.data.id },
    include: { job: true },
    data: {
      status: parsed.data.status,
      tags: tagValues,
      internalNote: parsed.data.internalNote || null,
      communications: parsed.data.communicationBody
        ? {
            create: {
              channel: parsed.data.communicationChannel || "note",
              direction: "internal",
              subject: "Poznámka redakce",
              body: parsed.data.communicationBody
            }
          }
        : undefined
    }
  });
  await logAdminActivity("status", "application", application.id, `Reakce ${application.name} u inzerátu ${application.job.title} změněna na ${application.status}.`);

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${application.id}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/jobs");
  if (parsed.data.returnTo) redirect(withActionResult(parsed.data.returnTo, "notice", "status"));
}

export async function forwardApplicationToCompany(formData: FormData) {
  await requireAdmin();
  const parsed = z.object({ id: required }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const application = await prisma.application.findUnique({
    where: { id: parsed.data.id },
    include: { job: { include: { company: true } } }
  });
  if (!application) return;

  const to = application.job.contactEmail || application.job.company.email;
  if (!to) redirect(`/admin/applications/${application.id}?error=no-company-email`);

  await sendTransactionalEmail({
    to,
    replyTo: application.email,
    subject: `Reakce na pozici ${application.job.title}`,
    html: `<p>Dobrý den, předáváme reakci na pozici <strong>${application.job.title}</strong>.</p><p><strong>${application.name}</strong><br>${application.email}<br>${application.phone ?? ""}</p><p>${application.message}</p>`
  });

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.FORWARDED,
      tags: { set: Array.from(new Set([...application.tags, ApplicationTag.FORWARDED_TO_COMPANY])) },
      communications: {
        create: {
          channel: "email",
          direction: "outbound",
          subject: `Předáno firmě: ${application.job.title}`,
          body: `Reakce byla předána na ${to}.`
        }
      }
    }
  });
  await logAdminActivity("forward", "application", application.id, `Reakce ${application.name} předána firmě ${application.job.company.name}.`);

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${application.id}`);
  redirect(`/admin/applications/${application.id}?notice=forwarded`);
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

  const existingJob = parsed.data.id ? await prisma.jobPost.findUnique({ where: { id: parsed.data.id } }) : null;
  const baseSlug = slugify(parsed.data.title);
  const now = new Date();
  const activeFrom =
    parsed.data.status === JobStatus.ACTIVE
      ? existingJob?.status === JobStatus.ACTIVE
        ? existingJob.activeFrom
        : now
      : existingJob?.activeFrom ?? null;
  const activeUntil =
    parsed.data.status === JobStatus.ACTIVE
      ? existingJob?.status === JobStatus.ACTIVE && existingJob.activeUntil && existingJob.activeUntil > now
        ? existingJob.activeUntil
        : addDays(now, parsed.data.durationDays)
      : parsed.data.status === JobStatus.EXPIRED
        ? existingJob?.activeUntil && existingJob.activeUntil < now
          ? existingJob.activeUntil
          : now
        : existingJob?.activeUntil ?? null;
  const renewedAt =
    parsed.data.status === JobStatus.ACTIVE
      ? existingJob?.status === JobStatus.ACTIVE
        ? existingJob.renewedAt
        : now
      : existingJob?.renewedAt ?? null;
  const selectedPackage = parsed.data.packageId ? await prisma.pricingPackage.findUnique({ where: { id: parsed.data.packageId } }) : null;
  const topDays = parsed.data.topDays || (!existingJob ? selectedPackage?.topDays : 0) || 0;
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
    topUntil: topDays ? addDays(now, topDays) : null,
    status: parsed.data.status,
    activeFrom,
    activeUntil,
    renewedAt,
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
  revalidatePath("/jobs");
  if (existingJob) revalidatePath(`/jobs/${existingJob.slug}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
  redirect("/admin/jobs?notice=saved");
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
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/dashboard");
  redirect("/admin/jobs?notice=status");
}

export async function expireJob(formData: FormData) {
  await requireAdmin();
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
