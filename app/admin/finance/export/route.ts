import { PaymentStatus, type Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  await requirePermission("finance:write");
  const url = new URL(request.url);
  const where: Prisma.InvoiceWhereInput = {};
  const company = url.searchParams.get("company")?.trim();
  const status = url.searchParams.get("status");
  const min = url.searchParams.get("min");
  const max = url.searchParams.get("max");

  if (company) where.company = { name: { contains: company, mode: "insensitive" } };
  if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) where.status = status as PaymentStatus;
  if (min || max) {
    where.amountCzk = {
      ...(min ? { gte: Number(min) } : {}),
      ...(max ? { lte: Number(max) } : {})
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { company: true, package: true, job: true },
    orderBy: { issuedAt: "desc" },
    take: 5000
  });

  const rows = [
    ["Vystaveno", "Uhrazeno", "Stav", "Číslo", "Firma", "Inzerát / balíček", "Částka Kč", "Poznámka"],
    ...invoices.map((invoice) => [
      invoice.issuedAt.toISOString(),
      invoice.paidAt?.toISOString() ?? "",
      invoice.status,
      invoice.number ?? "",
      invoice.company.name,
      invoice.job?.title ?? invoice.package?.name ?? "",
      invoice.amountCzk,
      invoice.note ?? ""
    ])
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  return new Response(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="faktury.csv"',
      "Content-Type": "text/csv; charset=utf-8"
    }
  });
}
