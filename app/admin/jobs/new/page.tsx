import { AdminShell } from "@/components/AdminShell";
import { JobEditor } from "@/components/JobEditor";
import { requireAdmin } from "@/lib/auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function NewJobPage() {
  await requireAdmin();
  const [filters, packages] = await Promise.all([
    getFilters(),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } })
  ]);

  return (
    <AdminShell>
      <h1>Přidat inzerát</h1>
      <JobEditor filters={filters} packages={packages} />
    </AdminShell>
  );
}
