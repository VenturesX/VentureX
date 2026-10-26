import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Link2, ListChecks, Plane, Route, Users } from "lucide-react";

const SERVICES = [
  {
    icon: Plane,
    title: "Airport transfers",
    body: "Arrivals and departures at Orlando International (MCO). Meet and greet, baggage-claim timing, and manifests that cover many flights. Coach, minibus, Sprinter, or SUV, sized to the group.",
  },
  {
    icon: Route,
    title: "Dine-arounds and event moves",
    body: "Hotel to dinner, a venue, or an attraction. One-way or round trip, with a Venture Rep on site when you want someone to guide the group.",
  },
  {
    icon: Users,
    title: "On-site Venture Reps",
    body: "A customer-service bonus: a real person on site to guide and assist. The live tools can carry the move if you don't need a rep there.",
  },
];

const STEPS = [
  {
    title: "Plan",
    body: "Tap the move, the guests, and the stops. A few clicks and the plan is on the page.",
  },
  {
    title: "Stay tuned",
    body: "Send it. We confirm the price. Nothing is reserved until you accept the quote.",
  },
  {
    title: "We coordinate",
    body: "A licensed operator drives. We handle the schedule and the day-of plan. Venture Reps join when you want them.",
  },
  {
    title: "Follow it live",
    body: "Planners watch live counts. Guests get a link for where to meet. No app to download.",
  },
];

const REASONS = [
  {
    icon: Users,
    title: "Venture Reps, when you want them",
    body: "A real person on site to guide and assist. The live tools can carry the schedule and guest updates, and a Venture Rep is there when you ask.",
  },
  {
    icon: Link2,
    title: "A live guest info link",
    body: "Guests open a link on their phone for where to meet and what happens next.",
  },
  {
    icon: ListChecks,
    title: "Live client counts",
    body: "Your team can see how the group is moving: waiting, boarded, and completed.",
  },
];

export function MarketingHome() {
  return (
    <>
      <section className="relative isolate min-h-[560px] overflow-hidden sm:min-h-[640px]">
        <Image
          src="/marketing/orlando-night.webp"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-[center_62%]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black from-[8%] via-black/80 via-[42%] to-black/20" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/45" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[560px] max-w-6xl items-center px-5 py-16 sm:min-h-[640px] sm:py-24">
          <div className="max-w-xl">
            <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block text-white">Group Transportation,</span>
              <span className="mt-1 block bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] bg-clip-text text-transparent">Handled.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/80">
              Seamless transportation for meetings, events, and tours. A few taps, a plan on the page, then you stay tuned.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/quote"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-5 text-base font-semibold text-white shadow-[0_10px_30px_rgba(30,144,255,0.35)]"
              >
                Get a Quote
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/shuttle"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-5 text-base font-semibold text-black"
              >
                Shuttle & bus tracking
              </Link>
              <Link
                href="/clipboard"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 px-5 text-base font-semibold text-white"
              >
                Curb clipboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-4 pt-10" aria-labelledby="field-ops">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Live field ops</p>
        <h2 id="field-ops" className="mt-2 text-3xl font-semibold tracking-tight">Open the curb from here</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <Link href="/shuttle" className="rounded-2xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#1E90FF]">Shuttle & bus tracking</p>
            <p className="mt-2 text-xl font-semibold">Route 3 live map</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">GPS pucks, hotel loop, and Chief&apos;s Night. Opens without a sign-in.</p>
          </Link>
          <Link href="/clipboard" className="rounded-2xl border border-white/15 bg-white/[0.04] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#1E90FF]">Curb clipboard</p>
            <p className="mt-2 text-xl font-semibold">Monday staff sheet</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">Roster, passenger counts, and the running log for the hotel curb.</p>
          </Link>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Services</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Seamless Transportation</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {SERVICES.map((service) => (
            <article key={service.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="grid size-10 place-items-center rounded-full bg-[#1E90FF]/15 text-[#1E90FF]">
                <service.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{service.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-4 pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Request to curb</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-white/10 p-5">
              <div className="text-sm font-semibold tracking-[0.16em] text-[#1E90FF]">{String(index + 1).padStart(2, "0")}</div>
              <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-4 pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Why us</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight">People on the ground, and a live picture of the move.</h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-3">
          {REASONS.map((reason) => (
            <li key={reason.title} className="rounded-2xl border border-[#1E90FF]/30 bg-[#1E90FF]/[0.06] p-5">
              <reason.icon className="size-5 text-[#1E90FF]" />
              <h3 className="mt-4 text-lg font-semibold">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{reason.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 pb-16">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#1E90FF]/40 bg-[#1E90FF]/10 px-6 py-10">
          <h2 className="text-3xl font-semibold tracking-tight">Click, click, go. Stay tuned.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            The plan appears as you enter the move. We confirm the price before anything is reserved.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#1E90FF] to-[#8B5CF6] px-5 text-base font-semibold text-white"
          >
            Get a Quote
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
