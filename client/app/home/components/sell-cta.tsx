import ArrowRightIcon from "@/components/ui/icons/arrow-right-svg";
import Perforations from "@/components/ui/perforations";
import Link from "next/link";

export default function SellCTA() {
  return (
    <section
      aria-labelledby="sell-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
    >
      {/* Perf top */}
      <Perforations count={52} className="justify-between" />

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
            List any ticket in under two minutes. We handle payment, delivery
            and buyer protection — you just collect.
          </p>
        </div>

        <nav>
          <ul className="list-none p-0 m-0 flex flex-col sm:flex-row gap-3 shrink-0">
            <li>
              {/* TODO: Add navigation later */}
              <Link
                href="#"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-zinc-950 font-black text-sm tracking-widest uppercase hover:bg-zinc-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white group"
              >
                Start selling
                <ArrowRightIcon />
              </Link>
            </li>
            <li>
              {/* TODO: Add navigation later */}
              <Link
                href="#"
                className="flex items-center justify-center px-8 py-4 border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 text-sm font-bold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                Learn more
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Perf bottom */}
      <Perforations count={52} className="justify-between" />
    </section>
  );
}
