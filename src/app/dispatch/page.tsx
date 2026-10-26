import { PortalShell } from "@/components/portal-shell";
import { DispatchBoard } from "@/components/portals/dispatch-board";
import { requirePortal } from "@/lib/session-server";

export default async function DispatchPage() {
  const { session, event } = await requirePortal("/dispatch");
  if (!event) return <p className="p-6">No active event. Seed the database.</p>;
  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName={event.name}
      nav={[
        { href: "/dispatch", label: "Airport board" },
        { href: "/shuttle", label: "Shuttle map" },
        { href: "/clipboard", label: "Clipboard" },
      ]}
    >
      <DispatchBoard eventId={event.id} />
    </PortalShell>
  );
}
