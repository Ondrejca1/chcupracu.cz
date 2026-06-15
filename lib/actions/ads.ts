"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdPlacementStatus } from "@prisma/client";
import { getAdSlotDefinition } from "@/lib/ad-slots";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAdSlotCapacity } from "@/lib/services/ad-capacity";
import { logAdminActivity } from "@/lib/services/activity-log";
import { optionalAssetUrl, required } from "@/lib/actions/shared";

export async function createAdPlacement(formData: FormData) {
  await requirePermission("ads:write");
  const parsed = z
    .object({
      name: required.max(120),
      placementKey: required.max(80),
      productType: z.enum(["PAID_AD", "JALOVEC", "PARTNER_OF_WEEK"]).optional(),
      clientName: z.string().trim().max(120).optional(),
      creativeUrl: optionalAssetUrl,
      targetUrl: optionalAssetUrl,
      priceCzk: z.coerce.number().int().min(0).optional(),
      durationDays: z.coerce.number().int().min(1).max(365).optional(),
      availableSlots: z.coerce.number().int().min(0).max(20).optional(),
      status: z.nativeEnum(AdPlacementStatus),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      isFeatured: z.string().optional(),
      note: z.string().trim().max(700).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const slot = getAdSlotDefinition(parsed.data.placementKey);
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date();
  const durationDays = parsed.data.durationDays ?? slot.defaultDurationDays;
  const availableSlots = parsed.data.availableSlots ?? slot.availableSlots;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : addDays(startsAt, durationDays);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt < startsAt) {
    redirect(`/admin/ads?slot=${slot.key}&error=date#new-ad`);
  }

  const checksCapacity = parsed.data.status === AdPlacementStatus.RESERVED || parsed.data.status === AdPlacementStatus.ACTIVE;
  if (checksCapacity) {
    const hasCapacity = await checkAdSlotCapacity(slot.key, startsAt, endsAt, availableSlots);
    if (!hasCapacity) redirect(`/admin/ads?slot=${slot.key}&error=slot-full#new-ad`);
  }

  try {
    const ad = await prisma.adPlacement.create({
      data: {
        name: parsed.data.name,
        placementKey: slot.key,
        productType: parsed.data.productType ?? slot.productType,
        location: slot.location,
        format: `${slot.format} · ${slot.recommendedSize}`,
        clientName: parsed.data.clientName || null,
        creativeUrl: parsed.data.creativeUrl || null,
        targetUrl: parsed.data.targetUrl || null,
        priceCzk: parsed.data.priceCzk ?? slot.defaultPriceCzk,
        durationDays,
        availableSlots,
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
  redirect(`/admin/ads?slot=${slot.key}&notice=created`);
}

export async function updateAdPlacement(formData: FormData) {
  await requirePermission("ads:write");
  const parsed = z
    .object({
      id: required,
      name: required.max(120),
      placementKey: required.max(80),
      productType: z.enum(["PAID_AD", "JALOVEC", "PARTNER_OF_WEEK"]).optional(),
      clientName: z.string().trim().max(120).optional(),
      creativeUrl: optionalAssetUrl,
      targetUrl: optionalAssetUrl,
      priceCzk: z.coerce.number().int().min(0).optional(),
      durationDays: z.coerce.number().int().min(1).max(365).optional(),
      availableSlots: z.coerce.number().int().min(0).max(20).optional(),
      status: z.nativeEnum(AdPlacementStatus),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      isFeatured: z.string().optional(),
      note: z.string().trim().max(700).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/ads?error=invalid");

  const slot = getAdSlotDefinition(parsed.data.placementKey);
  const existing = await prisma.adPlacement.findUnique({ where: { id: parsed.data.id } });
  if (!existing) redirect("/admin/ads?error=invalid");
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : existing.startsAt ?? new Date();
  const durationDays = parsed.data.durationDays ?? slot.defaultDurationDays;
  const availableSlots = parsed.data.availableSlots ?? slot.availableSlots;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : addDays(startsAt, durationDays);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt < startsAt) {
    redirect(`/admin/ads?slot=${slot.key}&error=date`);
  }
  if (
    (parsed.data.status === AdPlacementStatus.RESERVED || parsed.data.status === AdPlacementStatus.ACTIVE) &&
    !(await checkAdSlotCapacity(slot.key, startsAt, endsAt, availableSlots, parsed.data.id))
  ) {
    redirect(`/admin/ads?slot=${slot.key}&error=slot-full`);
  }

  const ad = await prisma.adPlacement.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      placementKey: slot.key,
      productType: parsed.data.productType ?? slot.productType,
      location: slot.location,
      format: `${slot.format} · ${slot.recommendedSize}`,
      clientName: parsed.data.clientName || null,
      creativeUrl: parsed.data.creativeUrl || null,
      targetUrl: parsed.data.targetUrl || null,
      priceCzk: parsed.data.priceCzk ?? slot.defaultPriceCzk,
      durationDays,
      availableSlots,
      status: parsed.data.status,
      startsAt,
      endsAt,
      isFeatured: parsed.data.isFeatured === "on",
      note: parsed.data.note || null
    }
  });
  await logAdminActivity("update", "adPlacement", ad.id, `Upravena reklamní kampaň ${ad.name}.`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/ads?slot=${slot.key}&notice=saved`);
}

export async function endAdPlacementNow(formData: FormData) {
  await requirePermission("ads:write");
  const id = String(formData.get("id") ?? "");
  const ad = await prisma.adPlacement.update({
    where: { id },
    data: { status: AdPlacementStatus.EXPIRED, endsAt: new Date() }
  });
  await logAdminActivity("expire", "adPlacement", ad.id, `Reklama ${ad.name} byla ukončena.`);
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/ads");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/ads?slot=${ad.placementKey}&notice=ended`);
}

export async function updateAdPlacementStatus(formData: FormData) {
  await requirePermission("ads:write");
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
