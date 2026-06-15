"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { required } from "@/lib/actions/shared";

export async function createPackage(formData: FormData) {
  await requirePermission("packages:write");
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
  await requirePermission("packages:write");
  const id = String(formData.get("id"));
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.pricingPackage.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/admin/packages");
}

export async function updatePackage(formData: FormData) {
  await requirePermission("packages:write");
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
