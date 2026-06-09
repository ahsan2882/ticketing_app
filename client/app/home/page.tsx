"use client";
import TicketIcon from "@/components/ui/icons/ticket-svg";

import Link from "next/link";
import HeroCarousel from "./components/hero-carousel";
import LiveSalesTicker from "./components/live-sales-ticker";
import EventCategories from "./components/categories-section";
import TrendingEvents from "./components/trending-section";
import VenuePassConcept from "./components/venue-pass-concept";
import TrustStrip from "./components/trust-strip";
import SellCTA from "./components/sell-cta";

export default function Home() {
  return (
    <>
      {" "}
      <div className="h-full bg-zinc-950 overflow-y-auto scroll-smooth">
        {/* ═══════════════════════════════════════
          1 · HERO CAROUSEL
          ═══════════════════════════════════════ */}
        <HeroCarousel />
        {/* ═══════════════════════════════════════
          2 · LIVE SALES TICKER
          ═══════════════════════════════════════ */}
        <LiveSalesTicker />

        {/* ═══════════════════════════════════════
          3 · EVENT CATEGORIES
          ═══════════════════════════════════════ */}
        <EventCategories />

        {/* ═══════════════════════════════════════
          4 · TRENDING THIS WEEK
          ═══════════════════════════════════════ */}
        <TrendingEvents />

        {/* ═══════════════════════════════════════
          5 · HOW IT WORKS
          ═══════════════════════════════════════ */}
        <VenuePassConcept />

        {/* ═══════════════════════════════════════
          6 · TRUST STRIP
          ═══════════════════════════════════════ */}
        <TrustStrip />

        {/* ═══════════════════════════════════════
          7 · SELL YOUR TICKETS CTA
          ═══════════════════════════════════════ */}
        <SellCTA />

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
                    <TicketIcon customClass="w-3.5 h-3.5 text-white" />
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
