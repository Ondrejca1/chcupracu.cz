import { prisma } from "@/lib/prisma";

export async function markPublicationIssueCurrent(id: string) {
  try {
    await prisma.$transaction([
      prisma.publicationIssue.updateMany({ data: { isCurrent: false } }),
      prisma.publicationIssue.update({ where: { id }, data: { isCurrent: true } })
    ]);
    return true;
  } catch (error) {
    console.error("Unable to set current publication issue with transaction, retrying single update.", error);
    try {
      await prisma.publicationIssue.update({ where: { id }, data: { isCurrent: true } });
      return true;
    } catch (retryError) {
      console.error("Unable to set current publication issue.", retryError);
      return false;
    }
  }
}
