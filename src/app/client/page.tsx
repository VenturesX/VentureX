import { PortalShell } from "@/components/portal-shell";
import { ClientBoard } from "@/components/portals/client-board";
import { requirePortal } from "@/lib/session-server";

export default async function ClientPage() {
  const { session, event } = await requirePortal("/client");
  if (!event) return <p className="p-6">No active event.</p>;
  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName={event.name}
      nav={[{ href: "/client", label: "Movement" }]}
    >
      <ClientBoard eventId={event.id} />
    </PortalShell>
  );
}
