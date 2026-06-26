import { notFound, redirect } from "next/navigation";
import { JobReviewStatus } from "@prisma/client";
import { ClientJobForm } from "@/components/ClientJobForm";
import { ClientShell } from "@/components/ClientShell";
import { requireClient } from "@/lib/client-auth";
import { getFilters } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

function isEditable(reviewStatus: JobReviewStatus) {
  return reviewStatus === JobReviewStatus.DRAFT || reviewStatus === JobReviewStatus.CHANGES_REQUESTED || reviewStatus === JobReviewStatus.REJECTED;
}

export default async function EditClientJobPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await requireClient();
  const { id } = await params;
  const [filters, packages, job] = await Promise.all([
    getFilters(),
    prisma.pricingPackage.findMany({ where: { isActive: true }, orderBy: { priceCzk: "asc" } }),
    prisma.jobPost.findFirst({
      where: { id, companyId: client.companyId },
      include: { suitabilities: true }
    })
  ]);
  if (!job) notFound();
  if (!isEditable(job.reviewStatus)) redirect(`/klient/inzeraty/${job.id}`);

  return (
    <ClientShell>
      <ClientJobForm filters={filters} packages={packages} job={job} />
    </ClientShell>
  );
}
