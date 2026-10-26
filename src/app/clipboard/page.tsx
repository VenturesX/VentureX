import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { ClipboardBoard } from "@/components/clipboard/clipboard-board";
import { getSession } from "@/lib/auth";
import { ROLE_HOME, canAccessPath } from "@/lib/roles";

export const metadata: Metadata = {
  title: "Clipboard · Venture Directors",
  description: "Curb dispatch sheet for on-site staff. Roster, breaks, boarding count, and the running log.",
};

export default async function ClipboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/clipboard");
  if (!canAccessPath(session.role, "/clipboard")) redirect(ROLE_HOME[session.role]);

  const nav =
    session.role === "MEET_GREET"
      ? [
          { href: "/meet-greet", label: "Arrivals" },
          { href: "/clipboard", label: "Clipboard" },
        ]
      : [
          { href: "/dispatch", label: "Live board" },
          { href: "/clipboard", label: "Clipboard" },
          { href: "/admin", label: "Admin" },
        ];

  return (
    <PortalShell
      role={session.role}
      name={session.name}
      eventName="Curb clipboard"
      nav={session.role === "ADMIN" ? nav : nav.filter((item) => item.href !== "/admin")}
      compact
    >
      <div className="-mx-4 -my-4 min-h-[calc(100dvh-3.25rem)] bg-black text-white">
        <ClipboardBoard
          backHref={session.role === "MEET_GREET" ? "/meet-greet" : "/dispatch"}
          backLabel={session.role === "MEET_GREET" ? "Arrivals" : "Dispatch"}
        />
      </div>
    </PortalShell>
  );
}
