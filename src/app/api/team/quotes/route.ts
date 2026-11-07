import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crewDenied } from "@/lib/crew-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await crewDenied(["admin"]);
  if (denied) return denied;
  const [quotes, calls] = await Promise.all([
    db.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        reference: true,
        contactName: true,
        company: true,
        email: true,
        phone: true,
        market: true,
        marketCity: true,
        pickup: true,
        dropoff: true,
        startDate: true,
        passengerCount: true,
        status: true,
        needsExpertCall: true,
        createdAt: true,
      },
    }),
    db.callbackRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  return NextResponse.json({
    quotes: quotes.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    calls: calls.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  });
}
