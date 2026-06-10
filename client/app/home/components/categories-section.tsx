import Link from "next/link";

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

export default function EventCategories() {
  return (
    <section
      aria-labelledby="categories-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
    >
      <header className="flex items-end justify-between mb-10">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase mb-2">
            What are you into?
          </p>
          <h2
            id="categories-heading"
            className="text-3xl font-black text-white tracking-tight"
          >
            Browse by category
          </h2>
        </div>
        {/* TODO: Add navigation later */}
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
            {/* TODO: Add navigation later */}
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
  );
}
