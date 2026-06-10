import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { activeJobWhere } from "@/lib/business-rules";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieName = `job_view_${slug.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
  const cookieStore = await cookies();
  if (cookieStore.get(cookieName)) return NextResponse.json({ counted: false });

  try {
    const job = await prisma.jobPost.findFirst({ where: { slug, ...activeJobWhere() }, select: { id: true } });
    if (!job) return NextResponse.json({ counted: false }, { status: 404 });
    await prisma.jobPost.update({ where: { id: job.id }, data: { views: { increment: 1 } } });
  } catch (error) {
    console.error("Unable to count job view.", error);
    return NextResponse.json({ counted: false }, { status: 202 });
  }

  const response = NextResponse.json({ counted: true });
  response.cookies.set(cookieName, "1", {
    httpOnly: true,
    maxAge: 60 * 60 * 6,
    sameSite: "lax",
    path: "/"
  });
  return response;
}
