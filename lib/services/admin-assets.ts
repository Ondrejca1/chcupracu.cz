import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "@/lib/slug";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf"
};

export async function storeAdminAsset(file: File) {
  if (!allowedTypes.has(file.type)) {
    return { ok: false as const, message: "Povoleny jsou obrázky JPG, PNG, WebP, GIF nebo PDF." };
  }

  const originalName = file.name.replace(/\.[^.]+$/, "");
  const safeName = slugify(originalName || "soubor").slice(0, 70) || "soubor";
  const extension = extensionByType[file.type] ?? "bin";
  const directory = path.join(process.cwd(), "public", "uploads", "admin");

  try {
    await mkdir(directory, { recursive: true });
    const filename = `${safeName}-${Date.now().toString(36)}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(directory, filename), bytes);
    return { ok: true as const, message: "Soubor byl nahrán.", url: `/uploads/admin/${filename}` };
  } catch (error) {
    console.error("Unable to upload admin asset.", error);
    return { ok: false as const, message: "Nahrávání souborů není v tomto prostředí dostupné. Vložte prosím URL ručně." };
  }
}
