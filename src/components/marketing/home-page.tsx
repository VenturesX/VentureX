import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plane, Route, Ship } from "lucide-react";
import { MISSION } from "@/lib/brand";

const SERVICES = [
  {
    icon: Plane,
    title: "Airport Meet & Greet",
    body: "Greeters at Orlando International (MCO). We watch the flight, meet the party, and move them to the hotel with the right vehicle.",
  },
  {
    icon: Route,
    title: "Shuttle & Event Transportation",
    body: "Convention loops, hotel-to-venue moves, and dine-arounds. A schedule the group can follow, and a crew on the curb.",
  },
  {
    icon: Ship,
    title: "Group Transfers / Port Canaveral",
    body: "Point-to-point across Greater Orlando and Central Florida, including cruise transfers at Port Canaveral.",
  },
];

const STEPS = [
  { title: "Tell us the move", body: "Dates, guest count, and the stops. A quote request takes a few minutes." },
  { title: "We confirm it", body: "You see the vehicle plan and the price. Nothing is reserved until you accept." },
  { title: "Operators drive", body: "Licensed carriers run the vehicles. We coordinate the day with your DMC." },
  { title: "Guests know where", body: "A link shows where to wait or load. No app to download." },
];

const WORK = ["Meet and greet", "Airport transfers", "Convention shuttles", "Port Canaveral", "Dine-arounds", "Group charters"];

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
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">{MISSION}</p>
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

      <section id="services" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Services</p>
        <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight">Orlando group transportation</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SERVICES.map((service) => (
            <article key={service.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="grid size-10 place-items-center rounded-full bg-[#1E90FF]/15 text-[#1E90FF]">
                <service.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/75">{service.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="scroll-mt-24 border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#1E90FF]">Who we work with</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">The crew and tech behind Orlando&apos;s DMCs.</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              We feed and partner with destination management companies, including MMI, TTS, CSI, PRA, and CMM. We do not replace them.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Venture Directors plans the transportation and puts people on the ground. Licensed operators drive the vehicles.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 p-5">
            <p className="text-sm font-semibold text-[#9ecbff]">10+ years in Orlando</p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Meet and greet, airport and convention transfers, and shuttle dispatch across Greater Orlando and Central Florida, including Port Canaveral.
            </p>
            <ul className="mt-5 grid grid-cols-2 gap-2">
              {WORK.map((item) => (
                <li key={item} className="rounded-xl bg-white/[0.04] px-3 py-3 text-sm">{item}</li>
              ))}
            </ul>
          </div>
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
