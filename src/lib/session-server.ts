import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLE_HOME, canAccessPath } from "@/lib/roles";
import { db } from "@/lib/db";

export async function requirePortal(path: string) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessPath(session.role, path)) redirect(ROLE_HOME[session.role]);
  const event = await db.event.findFirst({
    where: { deletedAt: null, status: "ACTIVE" },
    include: { client: true, geofences: { where: { deletedAt: null } } },
    orderBy: { startsAt: "asc" },
  });
  return { session, event };
}
