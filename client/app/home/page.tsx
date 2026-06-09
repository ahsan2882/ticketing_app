"use client";
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

const CATEGORIES = [
  {
    name: "Music",
    emoji: "🎵",
    count: "14,200+",
    gradient: "from-violet-700 to-fuchsia-700",
    border: "border-violet-700/40",
  },
  {
    name: "Sport",
    emoji: "⚽",
    count: "8,900+",
    gradient: "from-emerald-700 to-teal-600",
    border: "border-emerald-700/40",
  },
  {
    name: "Theatre",
    emoji: "🎭",
    count: "3,400+",
    gradient: "from-amber-700 to-orange-600",
    border: "border-amber-700/40",
  },
  {
    name: "Comedy",
    emoji: "🎤",
    count: "2,100+",
    gradient: "from-sky-700 to-blue-700",
    border: "border-sky-700/40",
  },
  {
    name: "Festival",
    emoji: "🎪",
    count: "980+",
    gradient: "from-rose-700 to-pink-700",
    border: "border-rose-700/40",
  },
  {
    name: "Arts",
    emoji: "🖼️",
    count: "1,600+",
    gradient: "from-indigo-700 to-violet-700",
    border: "border-indigo-700/40",
  },
];

const TRENDING = [
  {
    name: "Arctic Monkeys",
    venue: "Wembley Arena",
    city: "London",
    date: "14 JUN",
    cat: "ROCK",
    bar: "from-violet-600 to-fuchsia-600",
    price: 95,
  },
  {
    name: "Wimbledon Men's Final",
    venue: "Centre Court",
    city: "London",
    date: "13 JUL",
    cat: "TENNIS",
    bar: "from-emerald-600 to-teal-500",
    price: 210,
  },
  {
    name: "Cirque du Soleil",
    venue: "Royal Albert Hall",
    city: "London",
    date: "19 JUL",
    cat: "CIRCUS",
    bar: "from-amber-600 to-orange-500",
    price: 58,
  },
  {
    name: "Dave Chappelle",
    venue: "Royal Festival Hall",
    city: "London",
    date: "22 JUL",
    cat: "COMEDY",
    bar: "from-sky-600 to-blue-500",
    price: 72,
  },
  {
    name: "Beyoncé",
    venue: "Tottenham Hotspur Std.",
    city: "London",
    date: "2 AUG",
    cat: "POP",
    bar: "from-rose-600 to-pink-500",
    price: 130,
  },
  {
    name: "Formula 1 — British GP",
    venue: "Silverstone",
    city: "Northants",
    date: "6 AUG",
    cat: "MOTOR",
    bar: "from-red-600 to-orange-600",
    price: 185,
  },
];

const TICKER_ITEMS = [
  "2 tickets sold · Kendrick Lamar · New York",
  "5 tickets sold · Hamilton · London",
  "1 ticket sold · El Clásico · Madrid",
  "3 tickets sold · Beyoncé · London",
  "4 tickets sold · Arctic Monkeys · Wembley",
  "2 tickets sold · Dave Chappelle · London",
  "6 tickets sold · Olivia Rodrigo · London",
  "1 ticket sold · Formula 1 GP · Silverstone",
];

const STEPS = [
  {
    n: "01",
    title: "Browse events",
    body: "Search across 48,000+ live events in 190 cities worldwide.",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  {
    n: "02",
    title: "Pick your seats",
    body: "Choose from fan resales or official allocations — all guaranteed.",
    icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
  },
  {
    n: "03",
    title: "Instant delivery",
    body: "Get e-tickets to your account the moment your order is confirmed.",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
];

function Perforations({ count = 40, className = "" }) {
  return (
    <ol
      aria-hidden="true"
      className={`flex justify-between list-none p-0 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="w-2 h-2 rounded-full bg-zinc-800 shrink-0" />
      ))}
    </ol>
  );
}

export default function Home() {
  const { active, go, next, prev, pause, resume } = useCarousel(
    HERO_SLIDES.length,
  );
  const slide = HERO_SLIDES[active];

  return (
    <>
      {" "}
      <div className="h-full bg-zinc-950 overflow-y-auto scroll-smooth">
        {/* ═══════════════════════════════════════
          1 · HERO CAROUSEL
          ═══════════════════════════════════════ */}
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

                <hgroup className="space-y-2">
                  <h1
                    key={slide.id}
                    className="text-5xl lg:text-6xl font-black text-white leading-[0.95] tracking-tight"
                  >
                    {slide.artist}
                  </h1>
                  <p className="text-zinc-400 text-lg font-medium">
                    {slide.tour}
                  </p>
                </hgroup>

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
                  · From{" "}
                  <span className="text-white font-bold">${slide.from}</span>
                </p>

                <menu className="flex flex-wrap gap-3 list-none p-0 m-0">
                  <li>
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
                    <Link
                      href="#"
                      className="flex items-center px-6 py-3 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-sm font-bold transition-all duration-150"
                    >
                      View details
                    </Link>
                  </li>
                </menu>
              </div>

              {/* Right — giant ticket stub */}
              <figure
                key={slide.id}
                className="hidden lg:block"
                aria-label={`Ticket for ${slide.artist}`}
              >
                {/* Perf top */}
                <Perforations count={28} />

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
                      <p className="text-white/70 text-sm mt-0.5">
                        {slide.tour}
                      </p>
                    </div>
                    <svg
                      aria-hidden="true"
                      className="w-10 h-10 text-white/20 shrink-0 mt-1"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
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
                        <dd className="text-zinc-200 font-bold mt-0.5">
                          {val}
                        </dd>
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
                <Perforations count={28} />
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

        {/* ═══════════════════════════════════════
          2 · LIVE SALES TICKER
          ═══════════════════════════════════════ */}
        <aside
          aria-label="Recent sales"
          className="bg-zinc-900 border-y border-zinc-800 overflow-hidden py-2.5"
        >
          <div className="flex items-center gap-4">
            <p className="shrink-0 pl-4 text-[10px] font-black font-mono tracking-widest text-violet-400 uppercase border-r border-zinc-700 pr-4 py-0.5">
              Live sales
            </p>
            {/* Marquee — CSS animation */}
            <div className="overflow-hidden flex-1">
              <ul
                aria-live="polite"
                className="flex gap-10 list-none p-0 w-max animate-[marquee_30s_linear_infinite]"
                style={{ ["--tw-translate-x" as string]: "0" }}
              >
                {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs font-mono text-zinc-500 whitespace-nowrap shrink-0"
                  >
                    <span
                      aria-hidden="true"
                      className="w-1 h-1 rounded-full bg-emerald-500"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
        `}</style>
        </aside>

        {/* ═══════════════════════════════════════
          3 · EVENT CATEGORIES
          ═══════════════════════════════════════ */}
        <section
          aria-labelledby="categories-heading"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        >
          <header className="flex items-end justify-between mb-10">
            <hgroup>
              <p className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase mb-2">
                What are you into?
              </p>
              <h2
                id="categories-heading"
                className="text-3xl font-black text-white tracking-tight"
              >
                Browse by category
              </h2>
            </hgroup>
            <Link
              href="#"
              className="hidden sm:flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white font-mono transition-colors"
            >
              All categories
              <svg
                aria-hidden="true"
                className="w-3.5 h-3.5"
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
            </Link>
          </header>

          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 list-none p-0">
            {CATEGORIES.map((cat) => (
              <li key={cat.name}>
                <Link
                  href="#"
                  className={`group flex flex-col items-center justify-center gap-3 py-7 border ${cat.border} bg-zinc-900 hover:bg-zinc-800/80 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}
                >
                  <span
                    className={`flex items-center justify-center w-12 h-12 bg-linear-to-br ${cat.gradient} text-2xl`}
                    role="img"
                    aria-label={cat.name}
                  >
                    {cat.emoji}
                  </span>
                  <span className="text-center">
                    <span className="block text-white font-bold text-sm">
                      {cat.name}
                    </span>
                    <span className="block font-mono text-[10px] text-zinc-600 tracking-widest mt-0.5">
                      {cat.count} events
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ═══════════════════════════════════════
          4 · TRENDING THIS WEEK
          ═══════════════════════════════════════ */}
        <section
          aria-labelledby="trending-heading"
          className="bg-zinc-900/50 border-y border-zinc-800/60 py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="flex items-end justify-between mb-10">
              <hgroup>
                <p className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase mb-2">
                  Hot right now
                </p>
                <h2
                  id="trending-heading"
                  className="text-3xl font-black text-white tracking-tight"
                >
                  Trending this week
                </h2>
              </hgroup>
              <Link
                href="#"
                className="hidden sm:flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white font-mono transition-colors"
              >
                See all events
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
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
              </Link>
            </header>

            <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0">
              {TRENDING.map((ev, i) => (
                <li key={ev.name}>
                  <Link
                    href="#"
                    className="group flex items-stretch bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 h-full"
                  >
                    {/* Coloured bar */}
                    <span
                      className={`w-1.5 shrink-0 bg-linear-to-b ${ev.bar}`}
                      aria-hidden="true"
                    />

                    {/* Perforations */}
                    <span
                      aria-hidden="true"
                      className="flex flex-col justify-between py-3 px-1.5 border-r border-dashed border-zinc-800 group-hover:border-zinc-700 transition-colors"
                    >
                      {Array.from({ length: 6 }).map((_, j) => (
                        <span
                          key={j}
                          className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-zinc-700 transition-colors"
                        />
                      ))}
                    </span>

                    {/* Content */}
                    <span className="flex-1 flex items-center justify-between px-4 py-4 gap-3">
                      <span className="space-y-1 min-w-0">
                        <span className="block text-white text-sm font-bold tracking-tight truncate">
                          {ev.name}
                        </span>
                        <span className="block text-zinc-500 text-xs font-mono truncate">
                          {ev.venue}
                        </span>
                        <span className="inline-block font-mono text-[10px] font-black tracking-widest text-zinc-700 border border-zinc-800 px-1.5 py-px mt-1">
                          {ev.cat}
                        </span>
                      </span>
                      <span className="text-right shrink-0 space-y-1">
                        <span className="block text-zinc-400 text-xs font-mono">
                          {ev.date}
                        </span>
                        <span className="block text-white font-black text-sm">
                          £{ev.price}
                        </span>
                      </span>
                    </span>

                    {/* Right cutout */}
                    <span aria-hidden="true" className="flex items-center pr-2">
                      <svg
                        className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 group-hover:translate-x-0.5 transition-all duration-150"
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
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══════════════════════════════════════
          5 · HOW IT WORKS
          ═══════════════════════════════════════ */}
        <section
          aria-labelledby="how-heading"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        >
          <header className="text-center mb-14">
            <p className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase mb-2">
              Zero fuss
            </p>
            <h2
              id="how-heading"
              className="text-3xl font-black text-white tracking-tight"
            >
              From browse to front row in minutes
            </h2>
          </header>

          {/* Three steps as a joined ticket strip */}
          <ol className="grid md:grid-cols-3 list-none p-0 border border-zinc-800">
            {STEPS.map((step, i) => (
              <li
                key={step.n}
                className={`flex flex-col gap-5 p-8 bg-zinc-900 ${i < STEPS.length - 1 ? "border-b md:border-b-0 md:border-r border-dashed border-zinc-700" : ""}`}
              >
                <span className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-10 h-10 bg-linear-to-br from-violet-600 to-fuchsia-600 shrink-0">
                    <svg
                      aria-hidden="true"
                      className="w-5 h-5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d={step.icon} />
                    </svg>
                  </span>
                  <span className="font-mono text-4xl font-black text-zinc-800 leading-none">
                    {step.n}
                  </span>
                </span>
                <span>
                  <strong className="block text-white font-black text-base mb-1.5">
                    {step.title}
                  </strong>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {step.body}
                  </p>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══════════════════════════════════════
          6 · TRUST STRIP
          ═══════════════════════════════════════ */}
        <aside
          aria-label="Trust indicators"
          className="border-y border-zinc-800/60 bg-zinc-900/30"
        >
          <ul className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-8 list-none p-0">
            {[
              {
                stat: "48K+",
                label: "Live events",
                icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
              },
              {
                stat: "2.1M",
                label: "Tickets sold",
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
              },
              {
                stat: "190+",
                label: "Cities covered",
                icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
              },
              {
                stat: "100%",
                label: "Guaranteed",
                icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
              },
            ].map(({ stat, label, icon }) => (
              <li key={label} className="flex items-center gap-4">
                <span className="shrink-0 w-10 h-10 flex items-center justify-center bg-violet-600/10 border border-violet-600/20">
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-violet-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d={icon}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>
                  <strong className="block text-white font-black text-xl leading-none">
                    {stat}
                  </strong>
                  <span className="text-zinc-600 font-mono text-xs tracking-wide">
                    {label}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* ═══════════════════════════════════════
          7 · SELL YOUR TICKETS CTA
          ═══════════════════════════════════════ */}
        <section
          aria-labelledby="sell-heading"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        >
          {/* Perf top */}
          <Perforations count={52} />

          <div className="bg-linear-to-r from-violet-900/60 via-zinc-900 to-fuchsia-900/60 border-x border-zinc-800 px-8 sm:px-16 py-16 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="space-y-3 text-center md:text-left">
              <p className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase">
                Got spare tickets?
              </p>
              <h2
                id="sell-heading"
                className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight"
              >
                Turn them into cash.
                <br />
                <em className="not-italic bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  In minutes.
                </em>
              </h2>
              <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                List any ticket in under two minutes. We handle payment,
                delivery and buyer protection — you just collect.
              </p>
            </div>

            <menu className="flex flex-col sm:flex-row gap-3 list-none p-0 m-0 shrink-0">
              <li>
                <Link
                  href="#"
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-zinc-950 font-black text-sm tracking-widest uppercase hover:bg-zinc-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group"
                >
                  Start selling
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
                <Link
                  href="#"
                  className="flex items-center justify-center px-8 py-4 border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                >
                  Learn more
                </Link>
              </li>
            </menu>
          </div>

          {/* Perf bottom */}
          <Perforations count={52} />
        </section>

        {/* ═══════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════ */}
        <footer className="border-t border-zinc-800 bg-zinc-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {/* Brand col */}
              <section className="col-span-2 md:col-span-1 space-y-4">
                <Link
                  href="#"
                  className="flex items-center gap-2.5 w-fit"
                  aria-label="VenuePass home"
                >
                  <span className="flex items-center justify-center w-7 h-7 bg-linear-to-br from-violet-600 to-fuchsia-600">
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5 text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </span>
                  <span className="font-black text-white text-base">
                    Venue
                    <em className="not-italic bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                      Pass
                    </em>
                  </span>
                </Link>
                <p className="text-zinc-600 text-xs leading-relaxed max-w-45">
                  The marketplace for live event tickets — buy, sell, and never
                  miss a show.
                </p>
                <p className="text-zinc-700 font-mono text-[10px]">
                  © 2026 VENUEPASS INC.
                </p>
              </section>

              {/* Link cols */}
              {[
                {
                  heading: "Discover",
                  links: [
                    "Browse events",
                    "Trending",
                    "New listings",
                    "Last minute",
                  ],
                },
                {
                  heading: "Sell",
                  links: [
                    "List a ticket",
                    "Seller guide",
                    "Pricing & fees",
                    "Seller protection",
                  ],
                },
                {
                  heading: "Company",
                  links: ["About us", "Blog", "Careers", "Contact"],
                },
              ].map(({ heading, links }) => (
                <section key={heading}>
                  <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-4">
                    {heading}
                  </h3>
                  <ul className="space-y-2.5 list-none p-0">
                    {links.map((link) => (
                      <li key={link}>
                        <Link
                          href="#"
                          className="text-zinc-500 hover:text-white text-sm transition-colors duration-150 focus:outline-none focus-visible:underline"
                        >
                          {link}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="pt-6 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <nav aria-label="Legal links">
                <ul className="flex flex-wrap gap-4 list-none p-0">
                  {[
                    "Privacy policy",
                    "Terms of service",
                    "Cookie settings",
                  ].map((link) => (
                    <li key={link}>
                      <Link
                        href="#"
                        className="text-zinc-700 hover:text-zinc-400 text-xs font-mono transition-colors"
                      >
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <p className="font-mono text-zinc-700 text-[10px] tracking-widest">
                ALL TICKETS GUARANTEED ✦ 100% BUYER PROTECTION
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
