import { readFileSync } from "node:fs";

const checks = [
  {
    file: "prisma/schema.prisma",
    snippets: ["PENDING_PAYMENT", "ApplicationCommunication", "ApplicationTag", "AdProductType"]
  },
  {
    file: "lib/business-rules.ts",
    snippets: ["activeJobWhere", "activeAdWhere", "syncExpiredBusinessState"]
  },
  {
    file: "app/actions.ts",
    snippets: ["createApplication", "activeJobWhere()", "communications:", "checkAdSlotCapacity"]
  },
  {
    file: "app/admin/applications/[id]/page.tsx",
    snippets: ["Historie komunikace", "Předat firmě"]
  },
  {
    file: "app/admin/tasks/page.tsx",
    snippets: ["Úkoly redakce", "Aktivní bez faktury", "Reklamy bez kreativy"]
  },
  {
    file: "app/firmy/[slug]/page.tsx",
    snippets: ["Profil firmy", "activeJobWhere"]
  }
];

const failures = [];

for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const snippet of check.snippets) {
    if (!text.includes(snippet)) failures.push(`${check.file} missing ${snippet}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Smoke flow checks passed.");
