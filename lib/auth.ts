import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "chcupracu_admin";
export type LoginResult = { ok: true } | { ok: false; reason: "invalid" | "config" };

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    console.error("SESSION_SECRET must have at least 32 characters.");
    return null;
  }
  return secret;
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

  const secret = getSessionSecret();
  if (!secret) return { ok: false, reason: "config" } satisfies LoginResult;

  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const signature = signSession(admin.id, expires, secret);
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
  const secret = getSessionSecret();
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE)?.value;
  if (!secret || !value) redirect("/admin?login=1");

  const [id, expiresRaw, signature] = value.split(".");
  const expires = Number(expiresRaw);
  if (!id || !expires || !signature || expires < Date.now()) redirect("/admin?login=1");

  const expected = signSession(id, expires, secret);
  if (!signaturesMatch(signature, expected)) redirect("/admin?login=1");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) redirect("/admin?login=1");
  return admin;
}
