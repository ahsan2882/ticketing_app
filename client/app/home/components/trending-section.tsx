import Link from "next/link";

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

export default function TrendingEvents() {
  return (
    <section
      aria-labelledby="trending-heading"
      className="bg-zinc-900/50 border-y border-zinc-800/60 py-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex items-end justify-between mb-10">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase mb-2">
              Hot right now
            </p>
            <h2
              id="trending-heading"
              className="text-3xl font-black text-white tracking-tight"
            >
              Trending this week
            </h2>
          </div>
          {/* TODO: Add navigation later */}
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
          {TRENDING.map((ev) => (
            <li key={ev.name}>
              {/* TODO: Add navigation later */}
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
  );
}
