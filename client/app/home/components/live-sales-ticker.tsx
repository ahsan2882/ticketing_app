"use client";

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

export default function LiveSalesTicker() {
  return (
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
    </aside>
  );
}
