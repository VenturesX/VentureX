import Link from "next/link";
import { ArrowRight, Link2, ListChecks, Plane, Route, Users } from "lucide-react";
import { CurbSign } from "@/components/marketing/curb-sign";

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
    title: "Request",
    body: "Send the service, dates, pickup, drop-off, and passenger count.",
  },
  {
    title: "Quote",
    body: "We price the job by hand and send the quote back to you.",
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
      <section className="mx-auto grid max-w-6xl items-center gap-10 overflow-x-clip px-5 pb-6 pt-8 md:grid-cols-2 md:py-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Orlando group transportation</p>
          <h1 className="mt-4 text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
            Group
            <br />
            Transportation,
            <br />
            Handled.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">
            Seamless Transportation for Orlando meetings, events, and tours. Vetted operators drive. Add a Venture Rep when you want a real person on site to guide and assist.
          </p>
          <Link
            href="/quote"
            className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-[#1E90FF] px-5 text-base font-semibold text-white shadow-[0_10px_30px_rgba(30,144,255,0.35)]"
          >
            Get a Quote
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <CurbSign />
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
          <h2 className="text-3xl font-semibold tracking-tight">Send the group. We&apos;ll send the quote.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
            Dates, stops, vehicles, and headcount are enough to start. We price it and follow up.
          </p>
          <Link
            href="/quote"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-lg bg-[#1E90FF] px-5 text-base font-semibold text-white"
          >
            Get a Quote
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
