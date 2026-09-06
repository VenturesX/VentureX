import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const event = await db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    include: { client: true },
    orderBy: { startsAt: "asc" },
  });
  return NextResponse.json({ user: session, event });
}
