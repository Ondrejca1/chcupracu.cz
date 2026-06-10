import { ApplicationStatus, type Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const where: Prisma.ApplicationWhereInput = {};
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const job = url.searchParams.get("job");

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
      { job: { title: { contains: q, mode: "insensitive" } } },
      { job: { company: { name: { contains: q, mode: "insensitive" } } } }
    ];
  }
  if (status && Object.values(ApplicationStatus).includes(status as ApplicationStatus)) where.status = status as ApplicationStatus;
  if (job) where.jobId = job;

  const applications = await prisma.application.findMany({
    where,
    include: { job: { include: { company: true, city: true } } },
    orderBy: { createdAt: "desc" },
    take: 2000
  });

  const rows = [
    ["Datum", "Stav", "Jméno", "E-mail", "Telefon", "Inzerát", "Firma", "Město", "Zpráva", "Interní poznámka"],
    ...applications.map((application) => [
      application.createdAt.toISOString(),
      application.status,
      application.name,
      application.email,
      application.phone ?? "",
      application.job.title,
      application.job.company.name,
      application.job.city.name,
      application.message,
      application.internalNote ?? ""
    ])
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="reakce.csv"',
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
