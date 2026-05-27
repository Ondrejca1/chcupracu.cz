import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const COOKIE = "chcupracu_admin";

async function digest(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function login(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) return false;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must have at least 32 characters.");
  }

  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const signature = await digest(`${admin.id}.${expires}.${secret}`);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, `${admin.id}.${expires}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires)
  });
  return true;
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export async function requireAdmin() {
  const secret = process.env.SESSION_SECRET;
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE)?.value;
  if (!secret || !value) redirect("/admin?login=1");

  const [id, expiresRaw, signature] = value.split(".");
  const expires = Number(expiresRaw);
  if (!id || !expires || !signature || expires < Date.now()) redirect("/admin?login=1");

  const expected = await digest(`${id}.${expires}.${secret}`);
  if (expected !== signature) redirect("/admin?login=1");

  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) redirect("/admin?login=1");
  return admin;
}
