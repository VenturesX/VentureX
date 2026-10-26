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
          <h1 className="text-3xl sm:text-4xl font-semibold">Choose an operation</h1>
          <p className="text-muted-foreground max-w-xl">
            Shuttle and bus tracking runs the convention hotel loop. Airport and port meet-and-greet runs the arrival hall.
          </p>
        </div>
        <section className="space-y-3" aria-labelledby="shuttle-ops">
          <h2 id="shuttle-ops" className="text-xs uppercase tracking-[0.18em] text-primary">Shuttle & bus tracking</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Link href="/clipboard" className="block rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/50">
              <div className="text-xs uppercase tracking-wider text-primary">Curb</div>
              <div className="mt-2 text-lg font-medium">Clipboard</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Program and day tabs, driver roster, boarding clicker, and the running log. Opens without a sign-in.
              </p>
            </Link>
            <Link href="/shuttle" className="block rounded-2xl border border-white/10 bg-card p-5 hover:border-primary/50">
              <div className="text-xs uppercase tracking-wider text-primary">Route 3</div>
              <div className="mt-2 text-lg font-medium">Live route map</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Hotel loop, GPS pucks, EventFalcon pull, and curb-to-curb ETAs. Opens without a sign-in.
              </p>
            </Link>
          </div>
        </section>
        <section className="space-y-3" aria-labelledby="airport-ops">
          <h2 id="airport-ops" className="text-xs uppercase tracking-[0.18em] text-primary">Airport / port meet & greet</h2>
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
        </section>
        {!session ? (
          <Button render={<Link href="/login" />}>Sign in</Button>
        ) : null}
      </div>
    </div>
  );
}
