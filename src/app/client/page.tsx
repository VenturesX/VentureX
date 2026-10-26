import { PortalShell } from "@/components/portal-shell";
import { ClientBoard } from "@/components/portals/client-board";
import { GuestAccessPanel } from "@/components/portals/guest-access-panel";
import { directLineForEvent } from "@/lib/ops-settings";
import { requirePortal } from "@/lib/session-server";

export default async function ClientPage() {
  const { session, event } = await requirePortal("/client");
  if (!event) return <p className="p-6">No active event.</p>;
  const line = await directLineForEvent(event.directLinePhone);
  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName={event.name}
      nav={[{ href: "/client", label: "Movement" }]}
    >
      <GuestAccessPanel />
      <ClientBoard eventId={event.id} directLine={line.phone} />
    </PortalShell>
  );
}
