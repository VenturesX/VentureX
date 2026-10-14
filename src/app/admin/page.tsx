import { PortalShell } from "@/components/portal-shell";
import { AdminBoard } from "@/components/portals/admin-board";
import { requirePortal } from "@/lib/session-server";

export default async function AdminPage() {
  const { session, event } = await requirePortal("/admin");
  if (!event) return <p className="p-6">No active event. Seed the database.</p>;
  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName={event.name}
      nav={[
        { href: "/admin", label: "Admin" },
        { href: "/quotes", label: "Quote Requests" },
        { href: "/meet-greet", label: "M&G" },
        { href: "/dispatch", label: "Dispatch" },
        { href: "/driver", label: "Driver" },
        { href: "/client", label: "Client" },
      ]}
    >
      <AdminBoard eventId={event.id} />
    </PortalShell>
  );
}
