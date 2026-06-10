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

export default function VenuePassConcept() {
  return (
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
  );
}
