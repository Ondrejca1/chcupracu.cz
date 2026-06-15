"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminRole, AdminUserStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/services/activity-log";
import { email, password, required } from "@/lib/actions/shared";

export async function createAdminUser(formData: FormData) {
  await requirePermission("users:manage");
  const parsed = z
    .object({
      firstName: required.max(80),
      lastName: required.max(80),
      username: required.max(60),
      email,
      role: z.nativeEnum(AdminRole),
      status: z.nativeEnum(AdminUserStatus),
      password,
      forcePasswordChange: z.string().optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=invalid");

  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  try {
    const user = await prisma.adminUser.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        name: fullName,
        username: parsed.data.username.toLowerCase(),
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        status: parsed.data.status,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        forcePasswordChange: parsed.data.forcePasswordChange === "on"
      }
    });
    await logAdminActivity("create", "adminUser", user.id, `Vytvořen redakční účet ${user.email}.`);
  } catch (error) {
    console.error("Unable to create admin user.", error);
    redirect("/admin/users?error=user-exists");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=created");
}

export async function updateAdminUser(formData: FormData) {
  const actor = await requirePermission("users:manage");
  const parsed = z
    .object({
      id: required,
      firstName: required.max(80),
      lastName: required.max(80),
      username: required.max(60),
      email,
      role: z.nativeEnum(AdminRole),
      status: z.nativeEnum(AdminUserStatus)
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=invalid");
  if (parsed.data.id === actor.id && parsed.data.status !== AdminUserStatus.ACTIVE) redirect("/admin/users?error=self-disable");

  const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`.trim();
  try {
    const user = await prisma.adminUser.update({
      where: { id: parsed.data.id },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        name: fullName,
        username: parsed.data.username.toLowerCase(),
        email: parsed.data.email.toLowerCase(),
        role: parsed.data.role,
        status: parsed.data.status
      }
    });
    await logAdminActivity("update", "adminUser", user.id, `Upraven redakční účet ${user.email}.`);
  } catch (error) {
    console.error("Unable to update admin user.", error);
    redirect("/admin/users?error=user-exists");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=saved");
}

export async function setAdminUserPassword(formData: FormData) {
  await requirePermission("users:manage");
  const parsed = z
    .object({
      id: required,
      password,
      forcePasswordChange: z.string().optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?error=password");

  const user = await prisma.adminUser.update({
    where: { id: parsed.data.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      forcePasswordChange: parsed.data.forcePasswordChange === "on",
      failedLoginCount: 0,
      lockedUntil: null
    }
  });
  await logAdminActivity("password", "adminUser", user.id, `Správce změnil heslo účtu ${user.email}.`);

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=password");
}

export async function archiveAdminUser(formData: FormData) {
  const actor = await requirePermission("users:manage");
  const parsed = z.object({ id: required, status: z.nativeEnum(AdminUserStatus) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  if (parsed.data.id === actor.id) redirect("/admin/users?error=self-disable");

  const nextStatus = parsed.data.status === AdminUserStatus.ACTIVE ? AdminUserStatus.SUSPENDED : AdminUserStatus.ACTIVE;
  const user = await prisma.adminUser.update({ where: { id: parsed.data.id }, data: { status: nextStatus } });
  await logAdminActivity("status", "adminUser", user.id, `Účet ${user.email} změněn na ${user.status}.`);

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=status");
}
