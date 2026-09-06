import { PortalShell } from "@/components/portal-shell";
import { DriverBoard } from "@/components/portals/driver-board";
import { requirePortal } from "@/lib/session-server";

export default async function DriverPage() {
  const { session, event } = await requirePortal("/driver");
  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName={event?.name}
      nav={[{ href: "/driver", label: "My movement" }]}
      compact
    >
      <DriverBoard />
    </PortalShell>
  );
}
