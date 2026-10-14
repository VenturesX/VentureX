import { PortalShell } from "@/components/portal-shell";
import { GuestInbox } from "@/components/portals/guest-inbox";
import { requirePortal } from "@/lib/session-server";

export default async function InboxPage() {
  const { session, event } = await requirePortal("/inbox");
  const nav =
    session.role === "ADMIN"
      ? [
          { href: "/admin", label: "Admin" },
          { href: "/quotes", label: "Quotes" },
          { href: "/inbox", label: "Guest questions" },
          { href: "/meet-greet", label: "Arrivals" },
          { href: "/dispatch", label: "Dispatch" },
        ]
      : session.role === "DISPATCHER"
        ? [
            { href: "/dispatch", label: "Dispatch" },
            { href: "/quotes", label: "Quotes" },
            { href: "/inbox", label: "Guest questions" },
          ]
        : [
            { href: "/meet-greet", label: "Arrivals" },
            { href: "/inbox", label: "Guest questions" },
          ];
  return (
    <PortalShell role={session.role} name={session.name} eventName={event?.name} nav={nav} tone="field">
      <GuestInbox />
    </PortalShell>
  );
}
