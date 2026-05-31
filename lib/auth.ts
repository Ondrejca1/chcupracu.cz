import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "chcupracu_admin";
type SessionSecretError = "config_missing" | "config_short";
export type LoginResult = { ok: true } | { ok: false; reason: "invalid" | SessionSecretError };

function getSessionSecret() {
  const rawSecret = process.env.SESSION_SECRET;
  if (!rawSecret) {
    console.error("SESSION_SECRET is missing.");
    return { ok: false, reason: "config_missing" as const };
  }

  const secret = rawSecret.trim();
  if (secret.length < 32) {
    console.error(`SESSION_SECRET must have at least 32 characters. Current length: ${secret.length}.`);
    return { ok: false, reason: "config_short" as const };
  }

  return { ok: true, secret } as const;
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
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return { ok: false, reason: "invalid" } satisfies LoginResult;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return { ok: false, reason: "invalid" } satisfies LoginResult;

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
  return { ok: true } satisfies LoginResult;
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
  return admin;
}
