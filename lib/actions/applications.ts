"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApplicationStatus, ApplicationTag } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { activeJobWhere } from "@/lib/business-rules";
import { prisma } from "@/lib/prisma";
import { logAdminActivity, logSystemActivity } from "@/lib/services/activity-log";
import { escapeHtml, sendTransactionalEmail } from "@/lib/services/email";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { email, ipHash, required, withActionResult } from "@/lib/actions/shared";

export async function createApplication(_: unknown, formData: FormData) {
  const parsed = z
    .object({
      jobId: required,
      slug: required,
      name: required.max(120),
      email,
      phone: z.string().trim().max(40).optional(),
      message: required.max(2000),
      consentGdpr: z.literal("on"),
      website: z.string().trim().max(0).optional()
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
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "";
  const rate = checkRateLimit(`application:${forwardedFor || parsed.data.email}:${parsed.data.jobId}`, 4, 15 * 60_000);
  if (!rate.ok) return { ok: false, message: "Odpověď se teď nepodařilo odeslat. Zkuste to prosím za chvíli." };

  const application = await prisma.application.create({
    data: {
      jobId: parsed.data.jobId,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message,
      consentGdpr: true,
      ipHash: forwardedFor ? ipHash(forwardedFor) : null,
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
      html: `<p><strong>${escapeHtml(parsed.data.name)}</strong> odpověděl/a na inzerát <strong>${escapeHtml(job.title)}</strong>.</p><p>${escapeHtml(parsed.data.message)}</p><p>E-mail: ${escapeHtml(parsed.data.email)}<br>Telefon: ${escapeHtml(parsed.data.phone ?? "-")}</p>`
    });
  }

  const companyEmail = job.contactEmail || job.company.email;
  if (companyEmail && process.env.AUTO_NOTIFY_COMPANY === "true") {
    await sendTransactionalEmail({
      to: companyEmail,
      replyTo: parsed.data.email,
      subject: `Nová reakce z chcupracu.cz: ${job.title}`,
      html: `<p>Dobrý den, přišla nová reakce na pozici <strong>${escapeHtml(job.title)}</strong>.</p><p><strong>${escapeHtml(parsed.data.name)}</strong><br>${escapeHtml(parsed.data.email)}<br>${escapeHtml(parsed.data.phone ?? "")}</p><p>${escapeHtml(parsed.data.message)}</p>`
    });
  }

  revalidatePath(`/jobs/${parsed.data.slug}`);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/applications");
  return { ok: true, message: "Odpověď jsme uložili. Redakce ji předá zaměstnavateli." };
}

export async function updateApplication(formData: FormData) {
  await requirePermission("applications:write");
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

  const application: { id: string; name: string; status: ApplicationStatus; job: { title: string } } = await prisma.application.update({
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
  await requirePermission("applications:write");
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
    html: `<p>Dobrý den, předáváme reakci na pozici <strong>${escapeHtml(application.job.title)}</strong>.</p><p><strong>${escapeHtml(application.name)}</strong><br>${escapeHtml(application.email)}<br>${escapeHtml(application.phone ?? "")}</p><p>${escapeHtml(application.message)}</p>`
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
