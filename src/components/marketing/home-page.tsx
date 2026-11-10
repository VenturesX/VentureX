import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Bus, ChartNoAxesCombined, Plane, Route, Shield, Ship, Trophy } from "lucide-react";
import { HERO_SUB } from "@/lib/brand";

const SERVICES = [
  {
    icon: Plane,
    title: "Airport Meet & Greet",
    body: "Greeters at the gate. We track every flight, meet your party, and move them where they need to go.",
  },
  {
    icon: Route,
    title: "Event Shuttles",
    body: "Convention loops, dine-arounds, and venue moves. A schedule the group can follow, and a crew on the curb.",
  },
  {
    icon: Trophy,
    title: "Sports & School Transportation",
    body: "Sports teams, school trips, bands, choirs, and competitions. From local Orlando outings to tournament travel, we coordinate airport, hotel, and venue transfers—directly with your group or alongside your transportation and DMC partners.",
  },
  {
    icon: Ship,
    title: "Cruise Transfers",
    body: "Cruise terminals and group transfers, timed to the ship and the flight.",
  },
  {
    icon: Bus,
    title: "Group Charters",
    body: "A coach, Sprinter, or SUV sized to the group, with a director on the move when you want one.",
  },
];

const STEPS = [
  { title: "Tell us the move", body: "Dates, guest count, and the stops. A quote request takes a few minutes." },
  { title: "We confirm it", body: "You see the vehicle plan and the price. Nothing is reserved until you accept." },
  { title: "Your team on the ground", body: "We greet, load, and dispatch alongside your team and transportation partners." },
  { title: "Guests know where", body: "A link shows where to wait and load. No app to download." },
];

const TRUST = [
  { icon: BadgeCheck, title: "Vetted operators", body: "Licensed and insured transportation partners." },
  { icon: Shield, title: "On-site coordination", body: "A team managing guest greetings, loading, and dispatch." },
  { icon: Plane, title: "Guest care", body: "Clear meeting points and support from curb to destination." },
];

export function MarketingHome() {
  return (
    <>
      <section className="relative isolate min-h-[520px] overflow-hidden sm:min-h-[620px]">
        <Image
          src="/marketing/orlando-night.webp"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-[center_62%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black from-[6%] via-black/75 via-[46%] to-black/15" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/35" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[520px] max-w-6xl items-center px-5 py-16 sm:min-h-[620px] sm:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9ecbff]">Venture Directors</p>
            <h1 className="mt-3 text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-6xl">
              <span className="block text-white">Group Transportation,</span>
              <span className="mt-1 inline-block bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] bg-clip-text text-transparent">Handled.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">{HERO_SUB}</p>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-white/75">
              We partner with destination management companies and event planners to coordinate group transportation, welcome guests, and keep programs moving. Based in Orlando, serving Florida, and ready to travel with your team.
            </p>
            <div className="mt-8">
              <Link
                href="/quote"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-6 text-base font-semibold text-white shadow-[0_10px_30px_rgba(30,144,255,0.35)]"
              >
                Get a Quote
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#1E90FF]/20 bg-[#1E90FF]/[0.04]" aria-labelledby="live-counts">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2 md:items-center">
          <div>
            <h2 id="live-counts" className="text-3xl font-semibold tracking-tight">Live passenger counts</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Follow guest status as our crew updates it: who is expected, checked in, boarded, and departed throughout the program.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
            <ChartNoAxesCombined className="size-6 text-[#1E90FF]" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">One shared view for your team.</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              From airport arrivals to event shuttles, clear updates from our crew help planners coordinate the next move.
            </p>
            <Link href="/quote" className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#9ecbff]">
              Plan your program <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Services</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight">What we run</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <article key={service.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="grid size-10 place-items-center rounded-full bg-[#1E90FF]/15 text-[#1E90FF]">
                <service.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{service.body}</p>
            </article>
          ))}
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="text-lg font-semibold">…and more</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              If the group needs to move, ask. We will tell you straight whether we can run it.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]" aria-labelledby="safety">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Safety</p>
          <h2 id="safety" className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight">Safety is our first priority.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/80">
            Every operator we bring in is vetted, licensed, and insured. Every Venture Director on the ground is experienced and trained.
          </p>
          <ul className="mt-8 grid gap-3 md:grid-cols-3">
            {TRUST.map((item) => (
              <li key={item.title} className="rounded-2xl border border-white/10 p-5">
                <item.icon className="size-5 text-[#1E90FF]" />
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="about" className="mx-auto grid max-w-6xl scroll-mt-24 gap-8 px-5 py-16 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Who we work with</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Your DMC transportation partner.</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            We work alongside Orlando&apos;s destination management companies as an extension of your team, supporting your client relationships and the guest experience you promise.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            From transportation planning and airport meet-and-greets to on-site dispatch, we help your team stay connected throughout the program. We work alongside trusted, licensed and insured transportation operators.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 p-5">
          <h3 className="text-lg font-semibold">A partnership built around your program.</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            You bring the client relationship and program vision. We bring transportation coordination, a crew on the ground, and visibility into each move.
          </p>
          <p className="mt-4 text-sm font-medium text-white">Florida-based. Wherever your program goes, we go with it.</p>
        </div>
      </section>

      <section className="px-5 pb-4" aria-labelledby="nationwide">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 px-6 py-10">
          <h2 id="nationwide" className="text-3xl font-semibold tracking-tight">Orlando roots. Florida connections.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
            Florida-based. Wherever your program goes, we go with it.
          </p>
          <Link
            href="/quote?market=other"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-white px-5 text-sm font-semibold text-black"
          >
            Ask about your city
          </Link>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">From the request to the curb</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-white/10 p-5">
              <div className="text-sm font-semibold tracking-[0.16em] text-[#1E90FF]">{String(index + 1).padStart(2, "0")}</div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#1E90FF]/35 bg-gradient-to-br from-[#1E90FF]/15 to-[#8B5CF6]/10 px-6 py-12">
          <h2 className="text-3xl font-semibold tracking-tight">Ready when your group is.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Send the dates and the stops. We confirm the price before anything is reserved.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-6 text-base font-semibold text-white"
          >
            Get a Quote
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
