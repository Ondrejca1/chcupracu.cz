"use server";

import { requireAdmin } from "@/lib/auth";
import { storeAdminAsset } from "@/lib/services/admin-assets";

export async function uploadAdminAsset(formData: FormData) {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Soubor se nepodařilo načíst." };
  if (file.size === 0) return { ok: false, message: "Soubor je prázdný." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Soubor může mít maximálně 5 MB." };
  return storeAdminAsset(file);
}
