import { AdminShell } from "@/components/AdminShell";
import { JobEditor } from "@/components/JobEditor";
import { requirePermission } from "@/lib/auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function NewJobPage() {
  await requirePermission("jobs:write");
  const [filters, packages] = await Promise.all([
    getFilters(),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } })
  ]);

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Nová nabídka</span>
          <h1>Přidat inzerát</h1>
          <p>Vložení nabídky od firmy, nastavení balíčku, topování, médií a zobrazení na veřejném webu.</p>
        </div>
      </div>
      <JobEditor filters={filters} packages={packages} />
    </AdminShell>
  );
}
