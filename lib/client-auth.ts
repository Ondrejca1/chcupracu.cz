import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "node:crypto";
import { ClientUserStatus, type ClientUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE = "chcupracu_client";
type SessionSecretError = "config_missing" | "config_short";
type SessionSecretResult = { ok: true; secret: string } | { ok: false; reason: SessionSecretError };
export type ClientLoginResult = { ok: true } | { ok: false; reason: "invalid" | "inactive" | "locked" | SessionSecretError };

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

async function setClientSession(clientId: string) {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret.ok) return sessionSecret;

  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const signature = signSession(clientId, expires, sessionSecret.secret);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, `${clientId}.${expires}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires)
  });
  return { ok: true as const };
}

export async function loginClient(email: string, password: string) {
  const identifier = email.trim().toLowerCase();
  const client = await prisma.clientUser.findUnique({ where: { email: identifier } });
  if (!client) return { ok: false, reason: "invalid" } satisfies ClientLoginResult;
  if (client.status !== ClientUserStatus.ACTIVE) return { ok: false, reason: "inactive" } satisfies ClientLoginResult;
  if (client.lockedUntil && client.lockedUntil > new Date()) return { ok: false, reason: "locked" } satisfies ClientLoginResult;

  const ok = await bcrypt.compare(password, client.passwordHash);
  if (!ok) {
    const failedLoginCount = client.failedLoginCount + 1;
    await prisma.clientUser.update({
      where: { id: client.id },
      data: {
        failedLoginCount,
        lockedUntil: failedLoginCount >= 6 ? new Date(Date.now() + 15 * 60_000) : null
      }
    });
    return { ok: false, reason: "invalid" } satisfies ClientLoginResult;
  }

  const session = await setClientSession(client.id);
  if (!session.ok) return { ok: false, reason: session.reason } satisfies ClientLoginResult;

  await prisma.clientUser.update({
    where: { id: client.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date()
    }
  });
  return { ok: true } satisfies ClientLoginResult;
}

export async function loginClientById(clientId: string) {
  const session = await setClientSession(clientId);
  return session.ok;
}

export async function logoutClient() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

async function readClientFromCookie() {
  const sessionSecret = getSessionSecret();
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE)?.value;
  if (!sessionSecret.ok || !value) return null;

  const [id, expiresRaw, signature] = value.split(".");
  const expires = Number(expiresRaw);
  if (!id || !expires || !signature || expires < Date.now()) return null;

  const expected = signSession(id, expires, sessionSecret.secret);
  if (!signaturesMatch(signature, expected)) return null;

  const client = await prisma.clientUser.findUnique({
    where: { id },
    include: { company: true }
  });
  if (!client || client.status !== ClientUserStatus.ACTIVE) return null;
  return client;
}

export async function getOptionalClient() {
  return readClientFromCookie();
}

export async function requireClient() {
  const client = await readClientFromCookie();
  if (!client) redirect("/klient/prihlaseni");
  return client;
}

export function isCompanyClient(client: Pick<ClientUser, "companyId">, companyId: string) {
  return client.companyId === companyId;
}
