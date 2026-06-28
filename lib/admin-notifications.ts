import { AdPlacementStatus, ApplicationStatus, JobReviewStatus, JobSource, JobStatus, PaymentStatus } from "@prisma/client";
import { activeJobWhere, expiringJobWhere, syncExpiredBusinessState } from "@/lib/business-rules";
import { prisma } from "@/lib/prisma";

export type AdminNotificationTone = "info" | "warning" | "danger";

export type AdminNotificationItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: string;
  tone: AdminNotificationTone;
  count: number;
  meta?: string;
};

export type AdminNotificationSummary = {
  total: number;
  urgent: number;
  counts: {
    newApplications: number;
    clientReviewJobs: number;
    expiringJobs: number;
    unpaidInvoices: number;
    activeWithoutInvoice: number;
    paidButInactive: number;
    adsWithoutCreative: number;
  };
};

const soonFrom = (date: Date) => new Date(date.getTime() + 7 * 86_400_000);

export async function getAdminNotificationSummary(): Promise<AdminNotificationSummary> {
  await syncExpiredBusinessState();
  const now = new Date();
  const soon = soonFrom(now);

  const [
    newApplications,
    clientReviewJobs,
    expiringJobs,
    unpaidInvoices,
    activeWithoutInvoice,
    paidButInactive,
    adsWithoutCreative
  ] = await Promise.all([
    prisma.application.count({ where: { status: ApplicationStatus.NEW } }),
    prisma.jobPost.count({ where: { source: JobSource.CLIENT, reviewStatus: { in: [JobReviewStatus.SUBMITTED, JobReviewStatus.IN_REVIEW] } } }),
    prisma.jobPost.count({ where: expiringJobWhere(now, soon) }),
    prisma.invoice.count({ where: { status: PaymentStatus.UNPAID } }),
    prisma.jobPost.count({ where: { ...activeJobWhere(now), invoices: { none: {} } } }),
    prisma.invoice.count({
      where: {
        status: PaymentStatus.PAID,
        job: { is: { OR: [{ status: { not: JobStatus.ACTIVE } }, { activeUntil: { lt: now } }] } }
      }
    }),
    prisma.adPlacement.count({
      where: {
        status: { in: [AdPlacementStatus.RESERVED, AdPlacementStatus.ACTIVE] },
        OR: [{ creativeUrl: null }, { creativeUrl: "" }]
      }
    })
  ]);

  const total =
    newApplications +
    clientReviewJobs +
    expiringJobs +
    unpaidInvoices +
    activeWithoutInvoice +
    paidButInactive +
    adsWithoutCreative;

  return {
    total,
    urgent: newApplications + clientReviewJobs + paidButInactive,
    counts: {
      newApplications,
      clientReviewJobs,
      expiringJobs,
      unpaidInvoices,
      activeWithoutInvoice,
      paidButInactive,
      adsWithoutCreative
    }
  };
}

export async function getAdminNotifications() {
  const summary = await getAdminNotificationSummary();
  const items: AdminNotificationItem[] = [];

  if (summary.counts.newApplications > 0) {
    items.push({
      id: "new-applications",
      title: "Nové reakce uchazečů",
      description: "Kontakty čekají na první zpracování nebo předání firmě.",
      href: "/admin/applications?status=NEW",
      category: "Reakce",
      tone: "danger",
      count: summary.counts.newApplications
    });
  }

  if (summary.counts.clientReviewJobs > 0) {
    items.push({
      id: "client-review-jobs",
      title: "Klientské inzeráty ke schválení",
      description: "Firmy odeslaly inzeráty, které potřebují redakční kontrolu.",
      href: "/admin/jobs?view=client-review",
      category: "Schvalování",
      tone: "danger",
      count: summary.counts.clientReviewJobs
    });
  }

  if (summary.counts.expiringJobs > 0) {
    items.push({
      id: "expiring-jobs",
      title: "Inzeráty končí do 7 dní",
      description: "Vhodné pro obnovu, obchodní follow-up nebo domluvu topování.",
      href: "/admin/tasks",
      category: "Obchod",
      tone: "warning",
      count: summary.counts.expiringJobs
    });
  }

  if (summary.counts.unpaidInvoices > 0) {
    items.push({
      id: "unpaid-invoices",
      title: "Nezaplacené faktury",
      description: "Otevřené položky ve financích, které mohou blokovat publikaci nebo obnovu.",
      href: "/admin/finance?status=UNPAID",
      category: "Finance",
      tone: "warning",
      count: summary.counts.unpaidInvoices
    });
  }

  if (summary.counts.activeWithoutInvoice > 0) {
    items.push({
      id: "active-without-invoice",
      title: "Aktivní inzeráty bez faktury",
      description: "Veřejně běží nabídky bez fakturační stopy.",
      href: "/admin/tasks",
      category: "Kontrola",
      tone: "warning",
      count: summary.counts.activeWithoutInvoice
    });
  }

  if (summary.counts.paidButInactive > 0) {
    items.push({
      id: "paid-but-inactive",
      title: "Zaplaceno, ale neaktivní",
      description: "Platba je evidovaná, ale navázaný inzerát není viditelný.",
      href: "/admin/tasks",
      category: "Publikace",
      tone: "danger",
      count: summary.counts.paidButInactive
    });
  }

  if (summary.counts.adsWithoutCreative > 0) {
    items.push({
      id: "ads-without-creative",
      title: "Reklamy bez kreativy",
      description: "Rezervované nebo aktivní kampaně nemají obrázek/banner.",
      href: "/admin/ads",
      category: "Reklama",
      tone: "info",
      count: summary.counts.adsWithoutCreative
    });
  }

  return {
    ...summary,
    items
  };
}
