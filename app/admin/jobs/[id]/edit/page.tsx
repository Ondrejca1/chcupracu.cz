import { notFound } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { JobEditor } from "@/components/JobEditor";
import { requireAdmin } from "@/lib/auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [filters, packages, job] = await Promise.all([
    getFilters(),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } }),
    prisma.jobPost.findUnique({ where: { id }, include: { company: true, suitabilities: true } })
  ]);
  if (!job) notFound();

  return (
    <AdminShell>
      <div className="admin-page-head">
        <div>
          <span className="admin-kicker">Úprava nabídky</span>
          <h1>Editovat inzerát</h1>
          <p>Kontrola obsahu, topování, médií a obchodních parametrů před dalším zveřejněním.</p>
        </div>
      </div>
      <JobEditor filters={filters} packages={packages} job={job} />
    </AdminShell>
  );
}
