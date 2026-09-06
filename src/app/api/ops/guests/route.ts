import { NextResponse } from "next/server";
import { jsonError, requireApi } from "@/lib/api";
import { db } from "@/lib/db";
import { getFlightProvider } from "@/lib/providers/flights";
import type { GuestStatus, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    await requireApi("ops.read");
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() ?? "";
    const status = url.searchParams.get("status") as GuestStatus | null;
    const eventId = url.searchParams.get("eventId");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? 25)));
    const includeFlight = url.searchParams.get("flight") === "1";

    const where: Prisma.GuestWhereInput = {
      deletedAt: null,
      ...(eventId ? { eventId } : {}),
      ...(status ? { status } : {}),
    };
    if (q) {
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { confirmationCode: { contains: q } },
        { partyCode: { contains: q } },
        { flightNumber: { contains: q } },
        { email: { contains: q } },
        { hotelName: { contains: q } },
      ];
    }

    const [total, guests] = await Promise.all([
      db.guest.count({ where }),
      db.guest.findMany({
        where,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let flights: Record<string, unknown> = {};
    if (includeFlight) {
      const provider = getFlightProvider();
      const unique = [...new Set(guests.map((g) => g.flightNumber).filter(Boolean))] as string[];
      const looked = await Promise.all(unique.map((fn) => provider.lookup(fn)));
      flights = Object.fromEntries(looked.map((f) => [f.flightNumber.replace(/\s+/g, "").toUpperCase(), f]));
    }

    return NextResponse.json({
      guests,
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
      flights,
    });
  } catch (error) {
    return jsonError(error);
  }
}
