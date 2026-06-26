"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loginClient, loginClientById, logoutClient, requireClient } from "@/lib/client-auth";
import { email, password, required } from "@/lib/actions/shared";
import { slugify } from "@/lib/slug";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { escapeHtml, sendTransactionalEmail } from "@/lib/services/email";
import { logClientActivity } from "@/lib/services/activity-log";

async function requestIdentity(prefix: string, identifier?: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown";
  return `${prefix}:${ip}:${identifier?.trim().toLowerCase() ?? ""}`;
}

function authConfigMessage(reason: "config_missing" | "config_short") {
  return reason === "config_missing"
    ? "Klientská sekce není dokončená. Chybí proměnná SESSION_SECRET."
    : "Klientská sekce není dokončená. SESSION_SECRET musí mít alespoň 32 znaků.";
}

export async function clientLogin(_: unknown, formData: FormData) {
  const parsed = z.object({ email: required, password: required }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Vyplňte prosím e-mail a heslo." };

  const rate = checkRateLimit(await requestIdentity("client-login", parsed.data.email), 8, 15 * 60_000);
  if (!rate.ok) return { ok: false, message: "Příliš mnoho pokusů. Zkuste to prosím za chvíli." };

  const result = await loginClient(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.reason === "invalid"
          ? "Přihlášení se nepovedlo."
          : result.reason === "inactive"
            ? "Účet není aktivní. Kontaktujte redakci."
            : result.reason === "locked"
              ? "Účet je dočasně uzamčený po opakovaných pokusech."
              : authConfigMessage(result.reason)
    };
  }
  redirect("/klient");
}

export async function clientRegister(_: unknown, formData: FormData) {
  const parsed = z
    .object({
      companyName: required.max(160),
      ico: z.string().trim().max(20).optional(),
      name: required.max(120),
      email,
      phone: z.string().trim().max(40).optional(),
      password,
      passwordConfirm: required
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success || parsed.data.password !== parsed.data.passwordConfirm) {
    return { ok: false, message: "Zkontrolujte registraci. Hesla se musí shodovat a mít alespoň 10 znaků." };
  }

  const rate = checkRateLimit(await requestIdentity("client-register", parsed.data.email), 4, 60 * 60_000);
  if (!rate.ok) return { ok: false, message: "Registrací je teď příliš mnoho. Zkuste to prosím za chvíli." };

  const existingUser = await prisma.clientUser.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existingUser) return { ok: false, message: "Pro tento e-mail už klientský účet existuje." };

  const companySlug = slugify(parsed.data.companyName);
  const existingCompany = await prisma.company.findUnique({
    where: { slug: companySlug },
    include: { _count: { select: { clientUsers: true } } }
  });
  if (existingCompany?._count.clientUsers) {
    return { ok: false, message: "Firma už má klientský účet. Požádejte kolegu o přístup nebo kontaktujte redakci." };
  }

  const company = existingCompany
    ? await prisma.company.update({
        where: { id: existingCompany.id },
        data: {
          ico: existingCompany.ico ?? parsed.data.ico ?? null,
          contactName: existingCompany.contactName ?? parsed.data.name,
          email: existingCompany.email ?? parsed.data.email.toLowerCase(),
          phone: existingCompany.phone ?? parsed.data.phone ?? null
        }
      })
    : await prisma.company.create({
        data: {
          name: parsed.data.companyName,
          slug: companySlug,
          ico: parsed.data.ico || null,
          contactName: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          phone: parsed.data.phone || null
        }
      });

  const client = await prisma.clientUser.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      companyId: company.id
    }
  });

  await logClientActivity(client, "register", "clientUser", client.id, `Vytvořen klientský účet pro firmu ${company.name}.`);
  const loggedIn = await loginClientById(client.id);
  if (!loggedIn) {
    return { ok: false, message: "Účet je vytvořený, ale klientská sekce nemá správně nastavený SESSION_SECRET. Přihlášení zkuste po nastavení prostředí." };
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    await sendTransactionalEmail({
      to: adminEmail,
      replyTo: client.email,
      subject: `Nový klientský účet: ${company.name}`,
      html: `<p>Firma <strong>${escapeHtml(company.name)}</strong> vytvořila klientský účet.</p><p>Kontakt: ${escapeHtml(client.name)} · ${escapeHtml(client.email)} · ${escapeHtml(client.phone ?? "-")}</p>`
    });
  }

  revalidatePath("/admin/users");
  redirect("/klient?notice=registered");
}

export async function clientLogout() {
  await logoutClient();
  redirect("/klient/prihlaseni");
}

export async function changeClientPassword(formData: FormData) {
  const client = await requireClient();
  const parsed = z
    .object({
      currentPassword: required,
      password,
      passwordConfirm: required
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.password !== parsed.data.passwordConfirm) redirect("/klient/ucet?error=password");

  const user = await prisma.clientUser.findUniqueOrThrow({ where: { id: client.id } });
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) redirect("/klient/ucet?error=current-password");

  await prisma.clientUser.update({
    where: { id: client.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) }
  });
  await logClientActivity(client, "password", "clientUser", client.id, "Klient změnil vlastní heslo.");
  redirect("/klient/ucet?notice=password");
}

export async function updateClientAccount(formData: FormData) {
  const client = await requireClient();
  const parsed = z
    .object({
      name: required.max(120),
      phone: z.string().trim().max(40).optional(),
      companyName: required.max(160),
      ico: z.string().trim().max(20).optional(),
      companyEmail: email.optional().or(z.literal("")),
      companyPhone: z.string().trim().max(40).optional(),
      address: z.string().trim().max(240).optional(),
      note: z.string().trim().max(1200).optional()
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/klient/ucet?error=account");

  await prisma.$transaction([
    prisma.clientUser.update({
      where: { id: client.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null
      }
    }),
    prisma.company.update({
      where: { id: client.companyId },
      data: {
        name: parsed.data.companyName,
        ico: parsed.data.ico || null,
        contactName: parsed.data.name,
        email: parsed.data.companyEmail || client.email,
        phone: parsed.data.companyPhone || parsed.data.phone || null,
        address: parsed.data.address || null,
        note: parsed.data.note || null
      }
    })
  ]);

  await logClientActivity(client, "update", "company", client.companyId, "Klient upravil firemní a kontaktní údaje.");
  revalidatePath("/klient");
  revalidatePath("/klient/ucet");
  revalidatePath("/admin/jobs");
  redirect("/klient/ucet?notice=account");
}
