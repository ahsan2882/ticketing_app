"use client";

export default function TrustStrip() {
  return (
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
                <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
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
  );
}
