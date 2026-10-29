import { PortalShell } from "@/components/portal-shell";
import { AdminBoard } from "@/components/portals/admin-board";
import { FieldSettings } from "@/components/portals/field-settings";
import { GuestAccessPanel } from "@/components/portals/guest-access-panel";
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
        { href: "/quotes", label: "Quotes" },
        { href: "/inbox", label: "Guest questions" },
        { href: "/meet-greet", label: "Arrivals" },
        { href: "/dispatch", label: "Dispatch" },
        { href: "/shuttle", label: "Shuttle map" },
        { href: "/clipboard", label: "Clipboard" },
        { href: "/driver", label: "Driver" },
        { href: "/client", label: "Client" },
      ]}
    >
      <p className="mb-4 rounded-2xl border border-white/10 bg-[#0c0e12] p-4 text-sm" data-testid="payee">
        Make all checks payable to Arron Molina. Payee: Arron Molina / Venture Directors LLC.
        The live tier switches and margin tracker are on the Big Dog admin walkthrough.
      </p>
      <GuestAccessPanel />
      <FieldSettings eventId={event.id} />
      <AdminBoard eventId={event.id} />
    </PortalShell>
  );
}
