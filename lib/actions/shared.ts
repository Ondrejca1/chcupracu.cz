import { createHash } from "node:crypto";
import { z } from "zod";

export const required = z.string().trim().min(1, "Povinné pole");
export const email = z.string().trim().email("Neplatný e-mail");
export const password = z.string().min(10, "Heslo musí mít alespoň 10 znaků.");
export const dictionaryType = z.enum(["city", "category", "education", "employmentType", "suitability"]);

export const optionalAssetUrl = z
  .string()
  .trim()
  .refine((value) => !value || value.startsWith("/") || URL.canParse(value), "Neplatná URL")
  .optional()
  .or(z.literal(""));

export function withActionResult(path: string, key: "notice" | "error", value: string) {
  const url = new URL(path, "https://admin.local");
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const ipHash = (value: string) => createHash("sha256").update(value).digest("hex");

export function parseOptionalDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
