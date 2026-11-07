import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { todayET } from "@/lib/light/checkin";
import { CREW_COOKIE, readCrewToken, type CrewSession } from "@/lib/crew-session";

export async function crewSession(): Promise<CrewSession | null> {
  const store = await cookies();
  const token = store.get(CREW_COOKIE)?.value;
  if (!token) return null;
  return readCrewToken(token);
}

export async function crewDenied(kinds?: Array<CrewSession["kind"]>) {
  const session = await crewSession();
  if (!session || (kinds && !kinds.includes(session.kind))) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return null;
}

export async function fieldDenied() {
  const crew = await crewSession();
  if (crew && crew.kind !== "client") return null;
  if (await getSession()) return null;
  return NextResponse.json({ error: "Sign in required." }, { status: 401 });
}

export async function requireCrewDayCode(requested: string) {
  const session = await crewSession();
  if (!session || session.kind !== "crew" || !session.personId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const person = await db.lightRoster.findUnique({ where: { id: session.personId } });
  if (!person?.dayCode || person.checkedOutAt || person.dayCodeDate !== todayET()) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (requested && requested.trim() !== person.dayCode) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  return person.dayCode;
}
