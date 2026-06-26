"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { JobReviewStatus, JobStatus, PaymentStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { required } from "@/lib/actions/shared";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/services/activity-log";
import { escapeHtml, sendTransactionalEmail } from "@/lib/services/email";

const reviewSchema = z.object({
  id: required,
  note: z.string().trim().max(1600).optional()
});

async function notifyClient(job: { title: string; submittedByClient?: { email: string } | null; company: { email: string | null; name: string } }, subject: string, message: string) {
  const to = job.submittedByClient?.email || job.company.email;
  if (!to) return;
  await sendTransactionalEmail({
    to,
    subject,
    html: `<p>Dobrý den,</p><p>${message}</p><p><strong>${escapeHtml(job.title)}</strong></p><p>chcupracu.cz</p>`
  });
}

export async function markJobInReview(formData: FormData) {
  const admin = await requirePermission("jobs:write");
  const parsed = z.object({ id: required }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const job = await prisma.jobPost.update({
    where: { id: parsed.data.id },
    include: { company: true, submittedByClient: true },
    data: {
      reviewStatus: JobReviewStatus.IN_REVIEW,
      reviewedAt: new Date(),
      reviewedByAdminId: admin.id
    }
  });

  await logAdminActivity("review", "jobPost", job.id, `Redakce převzala inzerát ${job.title} do kontroly.`);
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${job.id}/edit`);
}

export async function requestJobChanges(formData: FormData) {
  const admin = await requirePermission("jobs:write");
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !parsed.data.note) return;

  const job = await prisma.jobPost.update({
    where: { id: parsed.data.id },
    include: { company: true, submittedByClient: true },
    data: {
      status: JobStatus.DRAFT,
      reviewStatus: JobReviewStatus.CHANGES_REQUESTED,
      reviewNote: parsed.data.note,
      reviewedAt: new Date(),
      reviewedByAdminId: admin.id,
      reviewComments: {
        create: {
          authorType: "admin",
          authorEmail: admin.email,
          message: parsed.data.note
        }
      }
    }
  });

  await logAdminActivity("changes", "jobPost", job.id, `Inzerát ${job.title} vrácen klientovi k úpravě.`);
  await notifyClient(job, `Úpravy inzerátu: ${job.title}`, `Redakce vrátila inzerát k úpravě: ${escapeHtml(parsed.data.note)}`);
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${job.id}/edit`);
  revalidatePath("/klient");
  redirect(`/admin/jobs/${job.id}/edit?notice=changes`);
}

export async function rejectClientJob(formData: FormData) {
  const admin = await requirePermission("jobs:write");
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const note = parsed.data.note || "Inzerát nebyl schválen.";
  const job = await prisma.jobPost.update({
    where: { id: parsed.data.id },
    include: { company: true, submittedByClient: true },
    data: {
      status: JobStatus.ARCHIVED,
      reviewStatus: JobReviewStatus.REJECTED,
      reviewNote: note,
      reviewedAt: new Date(),
      reviewedByAdminId: admin.id,
      reviewComments: {
        create: {
          authorType: "admin",
          authorEmail: admin.email,
          message: note
        }
      }
    }
  });

  await logAdminActivity("reject", "jobPost", job.id, `Inzerát ${job.title} zamítnut.`);
  await notifyClient(job, `Inzerát nebyl schválen: ${job.title}`, `Redakce inzerát neschválila: ${escapeHtml(note)}`);
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${job.id}/edit`);
  revalidatePath("/klient");
  redirect(`/admin/jobs/${job.id}/edit?notice=rejected`);
}

export async function approveClientJob(formData: FormData) {
  const admin = await requirePermission("jobs:write");
  const parsed = z
    .object({
      id: required,
      mode: z.enum(["payment", "publish"]),
      note: z.string().trim().max(1600).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const existing = await prisma.jobPost.findUnique({
    where: { id: parsed.data.id },
    include: {
      company: true,
      package: true,
      invoices: true,
      submittedByClient: true
    }
  });
  if (!existing) return;

  const now = new Date();
  const shouldPublish = parsed.data.mode === "publish" || !existing.package || existing.package.priceCzk === 0;
  const topDays = shouldPublish && existing.package?.isTopPlacement ? existing.package.topDays ?? 0 : 0;
  const job = await prisma.jobPost.update({
    where: { id: existing.id },
    include: { company: true, submittedByClient: true },
    data: {
      status: shouldPublish ? JobStatus.ACTIVE : JobStatus.PENDING_PAYMENT,
      reviewStatus: JobReviewStatus.APPROVED,
      reviewNote: parsed.data.note || null,
      reviewedAt: now,
      reviewedByAdminId: admin.id,
      activeFrom: shouldPublish ? now : existing.activeFrom,
      activeUntil: shouldPublish ? addDays(now, existing.package?.durationDays ?? 30) : existing.activeUntil,
      renewedAt: shouldPublish ? now : existing.renewedAt,
      isTop: topDays > 0,
      topUntil: topDays > 0 ? addDays(now, topDays) : existing.topUntil,
      highlightColor: existing.highlightColor || existing.package?.highlightColor || null,
      reviewComments: parsed.data.note
        ? {
            create: {
              authorType: "admin",
              authorEmail: admin.email,
              message: parsed.data.note
            }
          }
        : undefined
    }
  });

  if (existing.package && existing.invoices.length === 0) {
    await prisma.invoice.create({
      data: {
        companyId: existing.companyId,
        jobId: existing.id,
        packageId: existing.package.id,
        amountCzk: existing.package.priceCzk,
        status: shouldPublish ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAt: shouldPublish ? now : null,
        note: shouldPublish ? "Vystaveno při redakčním schválení a publikaci." : "Vystaveno při redakčním schválení klientského inzerátu."
      }
    });
  }

  await logAdminActivity(
    shouldPublish ? "approve_publish" : "approve",
    "jobPost",
    job.id,
    shouldPublish ? `Klientský inzerát ${job.title} schválen a publikován.` : `Klientský inzerát ${job.title} schválen a čeká na platbu.`
  );
  await notifyClient(
    job,
    shouldPublish ? `Inzerát je publikovaný: ${job.title}` : `Inzerát je schválený: ${job.title}`,
    shouldPublish ? "Redakce inzerát schválila a publikovala." : "Redakce inzerát schválila. Po vyřešení platby může být publikovaný."
  );

  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/finance");
  revalidatePath(`/admin/jobs/${job.id}/edit`);
  revalidatePath("/klient");
  redirect(`/admin/jobs/${job.id}/edit?notice=approved`);
}
