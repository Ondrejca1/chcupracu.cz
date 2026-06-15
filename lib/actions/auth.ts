"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminUserStatus } from "@prisma/client";
import { login, logout, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAdminActivity } from "@/lib/services/activity-log";
import { sendTransactionalEmail } from "@/lib/services/email";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { email, password, required, tokenHash } from "@/lib/actions/shared";

async function requestIdentity(prefix: string, identifier?: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}:${identifier?.trim().toLowerCase() ?? ""}`;
}

export async function adminLogin(_: unknown, formData: FormData) {
  const parsed = z.object({ email: required, password: required }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Vyplňte prosím e-mail a heslo." };
  const rate = checkRateLimit(await requestIdentity("admin-login", parsed.data.email), 8, 15 * 60_000);
  if (!rate.ok) return { ok: false, message: "Příliš mnoho pokusů. Zkuste to prosím za chvíli." };
  const result = await login(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    const configMessage =
      result.reason === "config_missing"
        ? "Administrace není dokončená. Na Vercelu chybí proměnná SESSION_SECRET pro aktuální prostředí."
        : "Administrace není dokončená. SESSION_SECRET na Vercelu musí mít alespoň 32 znaků.";

    return {
      ok: false,
      message:
        result.reason === "invalid"
          ? "Přihlášení se nepovedlo."
          : result.reason === "inactive"
            ? "Účet není aktivní. Kontaktujte správce administrace."
            : result.reason === "locked"
              ? "Účet je dočasně uzamčený po opakovaných pokusech."
              : configMessage
    };
  }
  redirect(result.forcePasswordChange ? "/admin/profile?notice=change-password" : "/admin/dashboard");
}

export async function adminLogout() {
  await logout();
  redirect("/admin");
}

export async function requestPasswordReset(_: unknown, formData: FormData) {
  const parsed = z.object({ email }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: true, message: "Pokud účet existuje, pošleme odkaz pro obnovu hesla." };
  const rate = checkRateLimit(await requestIdentity("password-reset", parsed.data.email), 3, 60 * 60_000);
  if (!rate.ok) return { ok: true, message: "Pokud účet existuje, pošleme odkaz pro obnovu hesla." };

  const user = await prisma.adminUser.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || user.status === AdminUserStatus.ARCHIVED) {
    return { ok: true, message: "Pokud účet existuje, pošleme odkaz pro obnovu hesla." };
  }

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(token),
      expiresAt: new Date(Date.now() + 30 * 60_000)
    }
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://chcupracu.vercel.app");
  const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;
  await sendTransactionalEmail({
    to: user.email,
    subject: "Obnova hesla do administrace chcupracu.cz",
    html: `<p>Dobrý den,</p><p>pro obnovu hesla použijte tento odkaz. Platí 30 minut.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Pokud jste obnovu nevyžádali, zprávu ignorujte.</p>`
  });

  return { ok: true, message: "Pokud účet existuje, pošleme odkaz pro obnovu hesla." };
}

export async function resetPassword(_: unknown, formData: FormData) {
  const parsed = z
    .object({
      token: required,
      password,
      passwordConfirm: required
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.password !== parsed.data.passwordConfirm) {
    return { ok: false, message: "Hesla se neshodují nebo jsou příliš krátká." };
  }

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash(parsed.data.token) },
    include: { user: true }
  });
  if (!reset || reset.usedAt || reset.expiresAt < new Date() || reset.user.status === AdminUserStatus.ARCHIVED) {
    return { ok: false, message: "Odkaz pro obnovu hesla je neplatný nebo vypršel." };
  }

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: reset.userId },
      data: {
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        status: AdminUserStatus.ACTIVE,
        forcePasswordChange: false,
        failedLoginCount: 0,
        lockedUntil: null
      }
    }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } })
  ]);

  return { ok: true, message: "Heslo bylo změněno. Můžete se přihlásit." };
}

export async function changeOwnPassword(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      currentPassword: z.string().optional(),
      password,
      passwordConfirm: required
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.password !== parsed.data.passwordConfirm) redirect("/admin/profile?error=password");

  const user = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id } });
  if (!user.forcePasswordChange) {
    const ok = parsed.data.currentPassword ? await bcrypt.compare(parsed.data.currentPassword, user.passwordHash) : false;
    if (!ok) redirect("/admin/profile?error=current-password");
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      forcePasswordChange: false,
      status: AdminUserStatus.ACTIVE
    }
  });
  await logAdminActivity("password", "adminUser", admin.id, "Uživatel změnil vlastní heslo.");
  redirect("/admin/profile?notice=password");
}
