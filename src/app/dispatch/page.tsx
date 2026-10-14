import { PortalShell } from "@/components/portal-shell";
import { DispatchBoard } from "@/components/portals/dispatch-board";
import { GuestAccessPanel } from "@/components/portals/guest-access-panel";
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
        { href: "/dispatch", label: "Dispatch" },
        { href: "/quotes", label: "Quotes" },
        { href: "/inbox", label: "Guest questions" },
      ]}
      tone="field"
    >
      <GuestAccessPanel />
      <DispatchBoard eventId={event.id} />
    </PortalShell>
  );
}
