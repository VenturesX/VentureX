import { PortalShell } from "@/components/portal-shell";
import { CallbackList } from "@/components/portals/callback-list";
import { QuoteRequestsBoard } from "@/components/portals/quote-requests";
import { requirePortal } from "@/lib/session-server";

export default async function QuotesPage() {
  const { session, event } = await requirePortal("/quotes");
  const nav =
    session.role === "ADMIN"
      ? [
          { href: "/admin", label: "Admin" },
          { href: "/quotes", label: "Quotes" },
          { href: "/inbox", label: "Guest questions" },
          { href: "/meet-greet", label: "Arrivals" },
          { href: "/dispatch", label: "Dispatch" },
        ]
      : [
          { href: "/dispatch", label: "Dispatch" },
          { href: "/quotes", label: "Quotes" },
          { href: "/inbox", label: "Guest questions" },
        ];

  return (
    <PortalShell role={session.role} name={session.name} eventName={event?.name} nav={nav}>
      <div className="space-y-8">
        <CallbackList />
        <QuoteRequestsBoard canEditPrice={session.role === "ADMIN"} />
      </div>
    </PortalShell>
  );
}
