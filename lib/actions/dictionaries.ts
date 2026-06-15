"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dictionaryType, required } from "@/lib/actions/shared";
import { slugify } from "@/lib/slug";

export async function createCity(formData: FormData) {
  await requirePermission("dictionaries:write");
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

export async function createDictionaryItem(formData: FormData) {
  await requirePermission("dictionaries:write");
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
  await requirePermission("dictionaries:write");
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
  await requirePermission("dictionaries:write");
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
  await requirePermission("dictionaries:write");
  const id = String(formData.get("id"));
  const isActive = String(formData.get("isActive")) === "true";
  await prisma.city.update({ where: { id }, data: { isActive: !isActive } });
  revalidatePath("/");
  revalidatePath("/admin/dictionaries");
}
