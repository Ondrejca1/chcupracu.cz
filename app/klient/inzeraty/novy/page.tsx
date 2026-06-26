import { ClientJobForm } from "@/components/ClientJobForm";
import { ClientShell } from "@/components/ClientShell";
import { requireClient } from "@/lib/client-auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function NewClientJobPage() {
  await requireClient();
  const [filters, packages] = await Promise.all([
    getFilters(),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } })
  ]);

  return (
    <ClientShell>
      <ClientJobForm filters={filters} packages={packages} />
    </ClientShell>
  );
}
