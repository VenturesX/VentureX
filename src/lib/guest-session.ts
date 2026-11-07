import { SignJWT, jwtVerify } from "jose";
import { endOfShiftUnix } from "@/lib/crew-session";

export const TRIP_COOKIE = "vd_trip";

export type TripSession = {
  programId: string;
  paxId: string;
  groupIds: string[];
  name: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signTripToken(session: TripSession) {
  return new SignJWT({
    kind: "trip",
    programId: session.programId,
    paxId: session.paxId,
    groupIds: session.groupIds.join(","),
    name: session.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(endOfShiftUnix())
    .sign(secret());
}

export async function readTripToken(token: string): Promise<TripSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.kind !== "trip" || !payload.programId) return null;
    return {
      programId: String(payload.programId),
      paxId: String(payload.paxId ?? ""),
      groupIds: String(payload.groupIds ?? "").split(",").filter(Boolean),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export function itemVisible(item: { paxId: string; everyone: boolean; groupIds: string[] }, session: { paxId: string; groupIds: string[] }) {
  if (item.paxId) return item.paxId === session.paxId;
  if (item.everyone) return true;
  return item.groupIds.some((id) => session.groupIds.includes(id));
}
