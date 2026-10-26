import { PortalShell } from "@/components/portal-shell";
import { MeetGreetBoard } from "@/components/portals/meet-greet-board";
import { requirePortal } from "@/lib/session-server";

export default async function MeetGreetPage() {
  const { session, event } = await requirePortal("/meet-greet");
  if (!event) return <p className="p-6">No active event. Seed the database.</p>;
  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName={event.name}
      nav={[
        { href: "/meet-greet", label: "Arrivals hall" },
        { href: "/clipboard", label: "Clipboard" },
      ]}
    >
      <MeetGreetBoard eventId={event.id} />
    </PortalShell>
  );
}
