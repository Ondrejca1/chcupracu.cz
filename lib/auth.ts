import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminRole, AdminUserStatus, type AdminUser } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "chcupracu_admin";
type SessionSecretError = "config_missing" | "config_short";
type SessionSecretResult = { ok: true; secret: string } | { ok: false; reason: SessionSecretError };
export type LoginResult = { ok: true; forcePasswordChange: boolean } | { ok: false; reason: "invalid" | "inactive" | "locked" | SessionSecretError };
export type AdminPermission =
  | "dashboard:view"
  | "tasks:view"
  | "jobs:write"
  | "applications:write"
  | "ads:write"
  | "jalovec:write"
  | "finance:write"
  | "packages:write"
  | "dictionaries:write"
  | "users:manage"
  | "health:view";

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  ADMIN: [
    "dashboard:view",
    "tasks:view",
    "jobs:write",
    "applications:write",
    "ads:write",
    "jalovec:write",
    "finance:write",
    "packages:write",
    "dictionaries:write",
    "users:manage",
    "health:view"
  ],
  EDITOR: ["dashboard:view", "tasks:view", "jobs:write", "applications:write", "ads:write", "jalovec:write", "dictionaries:write"],
  SALES: ["dashboard:view", "tasks:view", "jobs:write", "applications:write", "ads:write", "finance:write", "packages:write"],
  VIEWER: ["dashboard:view", "tasks:view", "health:view"]
};

export const adminRoleLabels: Record<AdminRole, string> = {
  ADMIN: "Administrátor",
  EDITOR: "Editor",
  SALES: "Obchod",
  VIEWER: "Náhled"
};

export const adminUserStatusLabels: Record<AdminUserStatus, string> = {
  PENDING: "Čeká na první přihlášení",
  ACTIVE: "Aktivní",
  SUSPENDED: "Pozastavený",
  ARCHIVED: "Archivovaný"
};

function getSessionSecret(): SessionSecretResult {
  const rawSecret = process.env.SESSION_SECRET;
  if (!rawSecret) {
    console.error("SESSION_SECRET is missing.");
    return { ok: false, reason: "config_missing" };
  }

  const secret = rawSecret.trim();
  if (secret.length < 32) {
    console.error(`SESSION_SECRET must have at least 32 characters. Current length: ${secret.length}.`);
    return { ok: false, reason: "config_short" };
  }

  return { ok: true, secret };
}

function signSession(id: string, expires: number, secret: string) {
  return createHmac("sha256", secret).update(`${id}.${expires}`).digest("hex");
}

function signaturesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function login(email: string, password: string) {
  const identifier = email.trim().toLowerCase();
  const admin = await prisma.adminUser.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] }
  });
  if (!admin) return { ok: false, reason: "invalid" } satisfies LoginResult;
  if (admin.status !== AdminUserStatus.ACTIVE && admin.status !== AdminUserStatus.PENDING) {
    return { ok: false, reason: "inactive" } satisfies LoginResult;
  }
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    return { ok: false, reason: "locked" } satisfies LoginResult;
  }
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    const failedLoginCount = admin.failedLoginCount + 1;
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedLoginCount,
        lockedUntil: failedLoginCount >= 6 ? new Date(Date.now() + 15 * 60_000) : null
      }
    });
    return { ok: false, reason: "invalid" } satisfies LoginResult;
  }

  const sessionSecret = getSessionSecret();
  if (!sessionSecret.ok) return { ok: false, reason: sessionSecret.reason } satisfies LoginResult;

  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const signature = signSession(admin.id, expires, sessionSecret.secret);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, `${admin.id}.${expires}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires)
  });
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      status: AdminUserStatus.ACTIVE,
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });
  return { ok: true, forcePasswordChange: admin.forcePasswordChange || admin.status === AdminUserStatus.PENDING } satisfies LoginResult;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export async function requireAdmin() {
  const sessionSecret = getSessionSecret();
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE)?.value;
  if (!sessionSecret.ok || !value) redirect("/admin?login=1");

  const [id, expiresRaw, signature] = value.split(".");
  const expires = Number(expiresRaw);
  if (!id || !expires || !signature || expires < Date.now()) redirect("/admin?login=1");

  const expected = signSession(id, expires, sessionSecret.secret);
  if (!signaturesMatch(signature, expected)) redirect("/admin?login=1");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) redirect("/admin?login=1");
  if (admin.status !== AdminUserStatus.ACTIVE && admin.status !== AdminUserStatus.PENDING) {
    await logout();
    redirect("/admin?login=1");
  }
  return admin;
}

export function hasPermission(admin: Pick<AdminUser, "role">, permission: AdminPermission) {
  return rolePermissions[admin.role].includes(permission);
}

export async function requirePermission(permission: AdminPermission) {
  const admin = await requireAdmin();
  if (!hasPermission(admin, permission)) redirect("/admin/dashboard?error=forbidden");
  return admin;
}

export async function getCurrentAdmin() {
  return requireAdmin();
}
