import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass } from "lucide-react";
import { getSession } from "@/lib/auth";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/roles";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();
  if (session && session.role !== "ADMIN") redirect(ROLE_HOME[session.role]);

  return (
    <div className="min-h-dvh px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary">
            <Compass className="size-5" />
          </span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Venture</div>
            <div className="text-xl font-semibold leading-none">Directors</div>
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold">Choose a portal</h1>
          <p className="text-muted-foreground max-w-xl">
            Role-based operations — not one overloaded screen. Run the airport
            arrival slice from Meet & Greet → Dispatch → Driver, then watch it on Client.
          </p>
        </div>
        <Link
          href={session ? "/clipboard" : "/login?next=/clipboard"}
          className="block rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/50"
        >
          <div className="text-xs uppercase tracking-wider text-primary">Field sheet</div>
          <div className="mt-2 text-lg font-medium">Clipboard</div>
          <p className="mt-2 text-sm text-muted-foreground">
            One screen for curb dispatch. Program and day tabs, driver roster, boarding clicker, and the running log.
          </p>
        </Link>
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["/meet-greet", "MEET_GREET", "Find the guest, check the party in, place them in the curb queue."],
              ["/dispatch", "DISPATCHER", "Live wait, available metal, assign or reassign with an audit reason."],
              ["/driver", "DRIVER", "One assignment. Maps. Five status taps."],
              ["/client", "CLIENT", "Read-only progress for Horizon DMC."],
              ["/admin", "ADMIN", "Clients, events, zones, users, CSV manifest, timing presets."],
            ] as const
          ).map(([href, role, copy]) => (
            <Link
              key={href}
              href={session ? href : "/login"}
              className="rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/50"
            >
              <div className="text-xs uppercase tracking-wider text-primary">{ROLE_LABEL[role]}</div>
              <div className="mt-2 text-lg font-medium">{href.replace("/", "") || "home"}</div>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
            </Link>
          ))}
        </div>
        {!session ? (
          <Button render={<Link href="/login" />}>Sign in</Button>
        ) : null}
      </div>
    </div>
  );
}
