import { PortalShell } from "@/components/portal-shell";
import { QuoteRequestsBoard } from "@/components/portals/quote-requests";
import { requirePortal } from "@/lib/session-server";

export default async function QuotesPage() {
  const { session, event } = await requirePortal("/quotes");
  const nav =
    session.role === "ADMIN"
      ? [
          { href: "/admin", label: "Admin" },
          { href: "/quotes", label: "Quote Requests" },
          { href: "/meet-greet", label: "M&G" },
          { href: "/dispatch", label: "Dispatch" },
          { href: "/driver", label: "Driver" },
          { href: "/client", label: "Client" },
        ]
      : [
          { href: "/dispatch", label: "Live board" },
          { href: "/quotes", label: "Quote Requests" },
        ];

  return (
    <PortalShell role={session.role} name={session.name} eventName={event?.name} nav={nav}>
      <QuoteRequestsBoard />
    </PortalShell>
  );
}
