"use client";

import SignInForm from "@/components/signin/signin-form";

export default function SignIn() {
  const recentEvents = [
    {
      name: "Arctic Monkeys",
      venue: "Wembley Arena",
      date: "SAT 14 JUN",
      cat: "Music",
      color: "from-violet-600 to-fuchsia-700",
    },
    {
      name: "El Clásico",
      venue: "Camp Nou",
      date: "SUN 22 JUN",
      cat: "Sport",
      color: "from-emerald-700 to-teal-600",
    },
    {
      name: "Hamilton",
      venue: "Victoria Palace",
      date: "FRI 27 JUN",
      cat: "Theatre",
      color: "from-amber-700 to-orange-600",
    },
  ];

  return (
    <>
      <main className="h-full bg-zinc-950 flex relative overflow-hidden">
        {/* ── Ambient background glows ── */}
        <aside
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none overflow-hidden"
        >
          <span className="absolute -top-60 -left-40 w-150 h-150 rounded-full bg-violet-700/15 blur-[120px]" />
          <span className="absolute -bottom-60 -right-40 w-150 h-150 rounded-full bg-fuchsia-700/10 blur-[120px]" />
          <span className="absolute top-1/3 left-1/2 w-96 h-96 rounded-full bg-violet-600/5 blur-3xl" />
          {/* Fine dot grid */}
          <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(139,92,246,0.08)_1px,transparent_1px)] bg-size-[32px_32px]" />
        </aside>

        {/* ══════════════════════════════════════════
          LEFT COLUMN — branding + live event cards
          ══════════════════════════════════════════ */}
        <aside className="hidden lg:flex flex-col w-[45%] justify-around relative px-14 py-12 overflow-hidden">
          {/* Left panel tinted background */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-linear-to-br from-zinc-900/80 via-zinc-950 to-zinc-950"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_60px,rgba(139,92,246,0.03)_60px,rgba(139,92,246,0.03)_61px)]"
          />

          {/* ── Logo ── */}
          <header className="relative">
            <p className="flex items-center gap-2.5 text-white font-mono text-sm tracking-widest uppercase">
              <svg
                className="w-5 h-5 text-violet-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              VenuePass
            </p>
          </header>

          {/* ── Hero copy ── */}
          <section className="relative mt-16 mb-10 space-y-4">
            <h2 className="text-[3.25rem] font-black text-white leading-none tracking-tight">
              Your tickets.
              <br />
              <em className="not-italic bg-linear-to-r from-violet-400 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">
                Your night.
              </em>
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
              Pick up where you left off — check your upcoming events, manage
              your listings, and grab what's selling fast.
            </p>
          </section>

          {/* ── Live event ticket cards ── */}
          <section className="relative space-y-3" aria-label="Trending events">
            <p className="text-zinc-600 font-mono text-xs tracking-widest uppercase mb-4">
              Trending right now
            </p>
            <ol className="space-y-3 list-none p-0">
              {recentEvents.map((ev, i) => (
                <li
                  key={ev.name}
                  className="group relative flex items-stretch overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors duration-200"
                >
                  {/* Coloured left bar */}
                  <span
                    className={`w-1.5 shrink-0 bg-linear-to-b ${ev.color}`}
                    aria-hidden="true"
                  />

                  {/* Perforations */}
                  <span
                    aria-hidden="true"
                    className="flex flex-col justify-between py-2 px-1.5 border-r border-dashed border-zinc-700"
                  >
                    {[...Array(5)].map((_, j) => (
                      <span
                        key={j}
                        className="w-1.5 h-1.5 rounded-full bg-zinc-800"
                      />
                    ))}
                  </span>

                  {/* Event info */}
                  <span className="flex-1 flex items-center justify-between px-4 py-3">
                    <span className="space-y-0.5">
                      <span className="block text-white text-sm font-bold tracking-tight">
                        {ev.name}
                      </span>
                      <span className="block text-zinc-500 text-xs font-mono">
                        {ev.venue}
                      </span>
                    </span>
                    <span className="text-right ml-4 shrink-0 space-y-0.5">
                      <span className="block text-zinc-400 text-xs font-mono">
                        {ev.date}
                      </span>
                      <span
                        className={`inline-block text-[10px] font-bold font-mono tracking-widest uppercase px-1.5 py-0.5 bg-linear-to-r ${ev.color} text-white`}
                      >
                        {ev.cat}
                      </span>
                    </span>
                  </span>

                  {/* Right cutout circles */}
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-950 border border-zinc-800"
                  />
                </li>
              ))}
            </ol>
          </section>

          {/* ── Stat strip ── */}
          <footer className="relative mt-10 pt-6 border-t border-zinc-800/60 grid grid-cols-3 gap-4">
            {[
              { n: "48K+", label: "Events live" },
              { n: "2.1M", label: "Tickets sold" },
              { n: "190+", label: "Cities covered" },
            ].map(({ n, label }) => (
              <section key={label} className="space-y-0.5">
                <p className="text-white font-black text-xl tracking-tight">
                  {n}
                </p>
                <p className="text-zinc-600 font-mono text-xs">{label}</p>
              </section>
            ))}
          </footer>
        </aside>

        {/* ── Torn-edge separator ── */}
        <aside
          aria-hidden="true"
          className="hidden lg:flex flex-col items-center py-0 w-5 relative shrink-0"
        >
          <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-zinc-800" />
          {/* Top and bottom cutout semicircles */}
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800" />
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-zinc-950 border border-zinc-800" />
          {/* Perforation dots along seam */}
          <ol className="flex flex-col justify-evenly h-full list-none p-0 py-6">
            {[...Array(20)].map((_, i) => (
              <li
                key={i}
                className="w-2 h-2 rounded-full bg-zinc-900 border border-zinc-800 shrink-0"
              />
            ))}
          </ol>
        </aside>

        {/* ══════════════════════════════════════════
          RIGHT COLUMN — sign-in form
          ══════════════════════════════════════════ */}
        <section className="flex-1 flex flex-col items-center justify-center px-8 py-12 relative">
          <article className="relative w-full max-w-[90%]">
            {/* ── Decorative ticket stub frame ── */}
            {/* Top perforation row */}
            <ol
              aria-hidden="true"
              className="flex justify-between px-1 list-none p-0 -mb-1"
            >
              {[...Array(24)].map((_, i) => (
                <li key={i} className="w-2 h-2 rounded-full bg-fuchsia-600" />
              ))}
            </ol>

            {/* Main card */}
            <section className="bg-zinc-900 border-x border-zinc-800 shadow-2xl shadow-violet-950/20">
              {/* Header gradient band */}
              <header className="relative overflow-hidden px-8 py-6 bg-linear-to-r from-violet-600 via-fuchsia-600 to-violet-700">
                {/* Stripe overlay */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgba(0,0,0,0.07)_8px,rgba(0,0,0,0.07)_16px)]"
                />
                {/* Cutout circles on sides */}
                <span
                  aria-hidden="true"
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950"
                />
                <span
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-950"
                />

                <hgroup className="relative">
                  <p className="flex items-center gap-2 text-white/50 font-mono text-[12px] tracking-[0.2em] uppercase mb-2">
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    Member Access
                  </p>
                  <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
                    Welcome back.
                  </h1>
                  <p className="text-white/60 text-[12px] mt-1 font-mono">
                    Your events are waiting.
                  </p>
                </hgroup>

                {/* Ticket stub meta top-right */}
                <aside
                  aria-label="Ticket reference"
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-right"
                >
                  <p className="text-white/30 font-mono text-[12px]">ADMIT</p>
                  <p className="text-white/80 font-mono font-bold">ONE ✦</p>
                </aside>
              </header>

              {/* Tear line */}
              <span
                aria-hidden="true"
                className="block mx-6 border-t border-dashed border-zinc-700/80"
              />

              {/* Form section */}
              <SignInForm />

              {/* Tear line before footer */}
              <span
                aria-hidden="true"
                className="block mx-6 border-t border-dashed border-zinc-700/80"
              />

              {/* Footer band */}
              <footer className="flex items-center justify-between px-8 py-3">
                <small className="text-zinc-600 font-mono text-[12px] not-italic tracking-widest">
                  VENUEPASS™
                </small>
                <nav aria-label="Event types">
                  <ul className="flex gap-1.5 list-none p-0">
                    {[
                      ["🎵", "Music"],
                      ["🎭", "Theatre"],
                      ["⚽", "Sports"],
                      ["🎪", "Events"],
                    ].map(([emoji, label]) => (
                      <li key={label}>
                        <span
                          role="img"
                          aria-label={label}
                          className="text-sm opacity-50 hover:opacity-100 transition-opacity cursor-default"
                        >
                          {emoji}
                        </span>
                      </li>
                    ))}
                  </ul>
                </nav>
                <small className="text-zinc-600 font-mono text-[12px] not-italic">
                  GATE B · 2
                </small>
              </footer>
            </section>

            {/* Bottom perforation row */}
            <ol
              aria-hidden="true"
              className="flex justify-between px-1  list-none p-0 -mt-1"
            >
              {[...Array(24)].map((_, i) => (
                <li key={i} className="w-2 h-2 rounded-full bg-zinc-800" />
              ))}
            </ol>

            {/* ── Mini event preview strip below the card ── */}
            <section
              aria-label="Recently viewed events"
              className="mt-6 space-y-2"
            >
              <p className="text-zinc-700 font-mono text-[14px] tracking-widest uppercase">
                Your recent events
              </p>
              <ol className="flex gap-2 list-none p-0">
                {[
                  {
                    name: "The Weeknd",
                    date: "Jul 3",
                    color: "bg-violet-900/60 border-violet-700/50",
                  },
                  {
                    name: "Wimbledon Final",
                    date: "Jul 13",
                    color: "bg-emerald-900/60 border-emerald-700/50",
                  },
                  {
                    name: "Cirque du Soleil",
                    date: "Jul 19",
                    color: "bg-amber-900/60 border-amber-700/50",
                  },
                ].map((ev) => (
                  <li
                    key={ev.name}
                    className={`flex-1 border ${ev.color} px-2.5 py-2`}
                  >
                    <p className="text-white text-[14px] font-bold leading-tight truncate">
                      {ev.name}
                    </p>
                    <p className="text-zinc-500 font-mono text-[12px] mt-0.5">
                      {ev.date}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </article>
        </section>
      </main>
    </>
  );
}
