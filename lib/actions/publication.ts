"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/services/activity-log";
import { markPublicationIssueCurrent } from "@/lib/services/publication-issue";
import { optionalAssetUrl, required } from "@/lib/actions/shared";

export async function createPublicationIssue(formData: FormData) {
  await requirePermission("jalovec:write");
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
  await requirePermission("jalovec:write");
  const id = String(formData.get("id"));
  const currentOk = await markPublicationIssueCurrent(id);
  if (currentOk) await logAdminActivity("setCurrent", "publicationIssue", id, "Změněno aktuální vydání Jalovce.");
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jalovec");
  revalidatePath("/admin/dashboard");
  redirect(currentOk ? "/admin/jalovec?notice=current" : "/admin/jalovec?error=current");
}
