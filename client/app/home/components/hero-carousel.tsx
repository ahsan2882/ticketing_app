"use client";

import TicketIcon from "@/components/ui/icons/ticket-svg";
import Perforations from "@/components/ui/perforations";
import { useCarousel } from "@/hooks/use-carousel";
import Link from "next/link";

const HERO_SLIDES = [
  {
    id: 1,
    artist: "Kendrick Lamar",
    tour: "Grand National Tour",
    venue: "Madison Square Garden",
    city: "New York, USA",
    date: "SAT 12 JUL 2026",
    cat: "HIP-HOP",
    from: 89,
    gradient: "from-violet-900 via-zinc-950 to-zinc-950",
    accent: "from-violet-500 to-fuchsia-500",
    tag: "bg-violet-600",
    seats: 1240,
  },
  {
    id: 2,
    artist: "Olivia Rodrigo",
    tour: "GUTS World Tour — Final Leg",
    venue: "The O2 Arena",
    city: "London, UK",
    date: "FRI 25 JUL 2026",
    cat: "POP",
    from: 65,
    gradient: "from-fuchsia-900 via-zinc-950 to-zinc-950",
    accent: "from-fuchsia-500 to-pink-500",
    tag: "bg-fuchsia-600",
    seats: 842,
  },
  {
    id: 3,
    artist: "El Clásico",
    tour: "Real Madrid vs FC Barcelona",
    venue: "Santiago Bernabéu",
    city: "Madrid, Spain",
    date: "SUN 3 AUG 2026",
    cat: "FOOTBALL",
    from: 120,
    gradient: "from-emerald-900 via-zinc-950 to-zinc-950",
    accent: "from-emerald-500 to-teal-400",
    tag: "bg-emerald-700",
    seats: 306,
  },
  {
    id: 4,
    artist: "Hamilton",
    tour: "10th Anniversary World Tour",
    venue: "Victoria Palace Theatre",
    city: "London, UK",
    date: "THU 14 AUG 2026",
    cat: "MUSICAL",
    from: 75,
    gradient: "from-amber-900 via-zinc-950 to-zinc-950",
    accent: "from-amber-500 to-orange-500",
    tag: "bg-amber-700",
    seats: 512,
  },
];

export default function HeroCarousel() {
  const { active, go, next, prev, pause, resume } = useCarousel(
    HERO_SLIDES.length,
  );
  const slide = HERO_SLIDES[active];
  return (
    <section
      aria-label="Featured events"
      className="relative overflow-hidden min-h-150"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {/* Ambient glow that transitions with slide */}
      <span
        aria-hidden="true"
        className={`absolute inset-0 bg-linear-to-br ${slide.gradient} transition-all duration-700`}
      />
      {/* Dot grid texture */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle,rgba(139,92,246,0.06)_1px,transparent_1px)] bg-size-[28px_28px]"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-125">
          {/* Left — slide text */}
          <div className="space-y-6">
            <p className="flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-zinc-500 uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Featured event {active + 1} of {HERO_SLIDES.length}
            </p>

            <div className="space-y-2">
              <h1
                key={slide.id}
                className="text-5xl lg:text-6xl font-black text-white leading-[0.95] tracking-tight"
              >
                {slide.artist}
              </h1>
              <p className="text-zinc-400 text-lg font-medium">{slide.tour}</p>
            </div>

            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-mono">
              <div>
                <dt className="sr-only">Venue</dt>
                <dd className="text-zinc-300">{slide.venue}</dd>
              </div>
              <div>
                <dt className="sr-only">City</dt>
                <dd className="text-zinc-500">{slide.city}</dd>
              </div>
              <div>
                <dt className="sr-only">Date</dt>
                <dd className="text-zinc-300">{slide.date}</dd>
              </div>
            </dl>

            <p className="text-zinc-500 text-sm font-mono">
              <span className="text-amber-400 font-bold">
                {slide.seats} left
              </span>{" "}
              · From <span className="text-white font-bold">${slide.from}</span>
            </p>

            <nav className="flex flex-wrap gap-3">
              <ul className="flex flex-wrap gap-3 list-none p-0 m-0">
                <li>
                  {/* TODO: Add navigation later */}
                  <Link
                    href="#"
                    className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black text-sm tracking-widest uppercase transition-all duration-200 group overflow-hidden"
                  >
                    Get tickets
                    <svg
                      aria-hidden="true"
                      className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
                <li>
                  {/* TODO: Add navigation later */}
                  <Link
                    href="#"
                    className="flex items-center px-6 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm font-bold transition-all duration-150"
                  >
                    View details
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Right — giant ticket stub */}
          <figure
            key={slide.id}
            className="hidden lg:block"
            aria-label={`Ticket for ${slide.artist}`}
          >
            {/* Perf top */}
            <Perforations count={28} className="justify-between" />

            <div className="bg-zinc-900 border-x border-zinc-800">
              {/* Gradient header */}
              <div
                className={`bg-linear-to-r ${slide.accent} p-6 flex items-start justify-between`}
              >
                <div>
                  <span
                    className={`inline-block ${slide.tag} text-white text-[10px] font-black font-mono tracking-widest px-2 py-0.5 mb-3`}
                  >
                    {slide.cat}
                  </span>
                  <p className="text-white font-black text-2xl leading-tight">
                    {slide.artist}
                  </p>
                  <p className="text-white/70 text-sm mt-0.5">{slide.tour}</p>
                </div>
                <TicketIcon customClass="w-10 h-10 text-white/20 shrink-0 mt-1" />
              </div>

              {/* Tear line */}
              <span
                aria-hidden="true"
                className="block mx-5 border-t border-dashed border-zinc-700"
              />

              {/* Ticket body */}
              <dl className="grid grid-cols-2 gap-0 p-5 font-mono text-xs">
                {[
                  ["Venue", slide.venue],
                  ["City", slide.city],
                  ["Date", slide.date],
                  ["From", `$${slide.from}`],
                  ["Avail.", slide.seats],
                  ["Format", "E-TICKET"],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="py-2 border-b border-zinc-800 pr-4"
                  >
                    <dt className="text-zinc-600 tracking-widest uppercase text-[10px]">
                      {label}
                    </dt>
                    <dd className="text-zinc-200 font-bold mt-0.5">{val}</dd>
                  </div>
                ))}
              </dl>

              {/* Barcode strip */}
              <figure
                aria-hidden="true"
                className="flex items-center gap-1 px-5 pb-5 pt-2"
              >
                {Array.from({ length: 48 }).map((_, i) => (
                  <span
                    key={i}
                    className="bg-zinc-700 shrink-0"
                    style={{
                      width: i % 3 === 0 ? 3 : 1,
                      height: i % 5 === 0 ? 32 : 24,
                    }}
                  />
                ))}
              </figure>
            </div>

            {/* Perf bottom */}
            <Perforations count={28} className="justify-between" />
          </figure>
        </div>

        {/* Carousel controls */}
        <nav
          aria-label="Slide navigation"
          className="flex items-center gap-4 mt-10"
        >
          <button
            type="button"
            onClick={prev}
            aria-label="Previous event"
            className="flex items-center justify-center w-9 h-9 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M15 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <ol
            className="flex gap-2 list-none p-0"
            role="tablist"
            aria-label="Event slides"
          >
            {HERO_SLIDES.map((s, i) => (
              <li key={s.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Go to slide ${i + 1}: ${s.artist}`}
                  onClick={() => go(i)}
                  className={`h-1.5 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${i === active ? "w-8 bg-linear-to-r from-violet-500 to-fuchsia-500" : "w-4 bg-zinc-700 hover:bg-zinc-500"}`}
                />
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={next}
            aria-label="Next event"
            className="flex items-center justify-center w-9 h-9 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M9 5l7 7-7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <p className="ml-auto font-mono text-zinc-600 text-xs tracking-widest">
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(HERO_SLIDES.length).padStart(2, "0")}
          </p>
        </nav>
      </div>
    </section>
  );
}
