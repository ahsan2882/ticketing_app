"use client";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import GradientButton from "../ui/gradient-button";
import TicketIcon from "../ui/icons/ticket-svg";

const NAV_LINKS = [
  { label: "Browse Events", href: "/tickets" },
  { label: "Sell Tickets", href: "/tickets/new" },
  { label: "Venues", href: "#" },
  { label: "How it works", href: "#" },
];

type CurrentUser = { email: string; id: string; name: string } | null;

export default function Header({ currentUser }: { currentUser: CurrentUser }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0]?.toUpperCase())
    .join("");

  const signOutHandler = async () => {
    try {
      await axios.post("/api/users/signout");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed:", error);
      alert("signout failed");
    }
  };
  return (
    <>
      <header className="w-full bg-zinc-950 border-b border-zinc-800/80 relative">
        {/* ── Thin top accent bar ── */}
        <aside
          aria-hidden="true"
          className="h-px w-full bg-linear-to-r from-transparent via-violet-500 to-transparent opacity-60"
        />

        {/* ── Main header row ── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            aria-label="Main navigation"
            className="flex items-center justify-between h-16 gap-6"
          >
            {/* ── Logo ── */}
            <Link
              href="/"
              className="flex items-center gap-2.5 shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-sm"
              aria-label="VenuePass home"
            >
              {/* Ticket icon */}
              <span className="relative flex items-center justify-center w-8 h-8 bg-linear-to-br from-violet-600 to-fuchsia-600 group-hover:from-violet-500 group-hover:to-fuchsia-500 transition-all duration-200 shrink-0">
                <TicketIcon customClass="w-4 h-4 text-white" />
                {/* Corner cut notches */}
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-zinc-950"
                />
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-zinc-950"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-zinc-950"
                />
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-zinc-950"
                />
              </span>
              <span className="font-black text-white tracking-tight text-lg leading-none">
                Venue
                <em className="not-italic bg-linear-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  Pass
                </em>
              </span>
            </Link>

            {/* ── Desktop nav links ── */}
            <ul
              className="hidden md:flex items-center gap-1 list-none p-0 flex-1 mx-4"
              role="list"
            >
              {NAV_LINKS.map(({ label, href }) => (
                <li key={label}>
                  {/* TODO: Add navigation later */}
                  <Link
                    href={href}
                    className="relative px-3.5 py-2 text-sm text-zinc-400 hover:text-white font-medium transition-colors duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
                  >
                    {label}
                    {/* Underline reveal */}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-3.5 right-3.5 h-px bg-linear-to-r from-violet-500 to-fuchsia-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"
                    />
                  </Link>
                </li>
              ))}
            </ul>

            {/* ── Desktop actions ── */}
            <nav className="hidden md:flex items-center gap-2 shrink-0">
              <ul className="hidden md:flex items-center gap-2 list-none p-0 m-0 shrink-0">
                {/* Live events badge */}
                <li>
                  {/* TODO: Add navigation later */}
                  <Link
                    href="#"
                    className="flex items-center gap-2 px-5 py-2 text-sm font-mono text-emerald-400 border border-emerald-800 hover:border-emerald-600 hover:bg-emerald-950/40 transition-all duration-150 rounded-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {/* Pulsing dot */}
                    <span
                      aria-hidden="true"
                      className="relative flex h-1.5 w-1.5"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    Live now
                  </Link>
                </li>

                {currentUser ? (
                  <>
                    {/* Profile button + dropdown */}
                    <li className="relative">
                      <button
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={profileOpen}
                        aria-controls="profile-dropdown"
                        onClick={() => setProfileOpen((o) => !o)}
                        className="flex items-center gap-2 px-5 py-1 border border-zinc-700 hover:border-violet-600 bg-zinc-900 hover:bg-zinc-800 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 group"
                      >
                        {/* Avatar */}
                        <span className="flex items-center justify-center w-7 h-7 bg-linear-to-br from-violet-600 to-fuchsia-600 shrink-0 text-white text-xs font-black">
                          {initials}
                        </span>
                        <span className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors leading-none">
                          My Profile
                        </span>
                        <svg
                          aria-hidden="true"
                          className={`w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all duration-200 ${profileOpen ? "rotate-180" : ""}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M19 9l-7 7-7-7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {/* Dropdown menu */}
                      {profileOpen && (
                        <div
                          id="profile-dropdown"
                          role="menu"
                          aria-label="Profile menu"
                          className="absolute right-0 top-full mt-2 w-56 bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/40 z-50"
                        >
                          {/* User info header */}
                          <header className="px-4 py-3 border-b border-zinc-800">
                            <p className="text-white text-sm font-bold truncate">
                              {currentUser.name}
                            </p>
                            <p className="text-zinc-500 text-xs font-mono truncate mt-0.5">
                              {currentUser.email}
                            </p>
                          </header>

                          <nav aria-label="Profile navigation">
                            <ul className="list-none p-0 py-1">
                              {[
                                {
                                  label: "My Tickets",
                                  icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z",
                                },
                                {
                                  label: "My Listings",
                                  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                                },
                                {
                                  label: "Order History",
                                  icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
                                },
                                {
                                  label: "Settings",
                                  icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
                                },
                              ].map(({ label, icon }) => (
                                <li key={label} role="none">
                                  {/* TODO: Add navigation later */}
                                  <Link
                                    href="#"
                                    role="menuitem"
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all duration-150 focus:outline-none focus-visible:bg-zinc-800"
                                  >
                                    <svg
                                      aria-hidden="true"
                                      className="w-4 h-4 shrink-0 text-zinc-600"
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
                                    {label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </nav>

                          {/* Tear line */}
                          <span
                            aria-hidden="true"
                            className="block mx-4 border-t border-dashed border-zinc-800"
                          />

                          {/* Sign out inside dropdown too */}
                          <div className="py-1">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={signOutHandler}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all duration-150 focus:outline-none focus-visible:bg-red-950/30"
                            >
                              <svg
                                aria-hidden="true"
                                className="w-4 h-4 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                              >
                                <path
                                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Sign out
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  </>
                ) : (
                  <>
                    {/* Sign in */}
                    <li>
                      <Link
                        href="/auth/signin"
                        className="relative overflow-hidden flex items-center gap-2 px-5 py-2 text-sm font-bold text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                      >
                        Sign in
                      </Link>
                    </li>

                    {/* Sign up — gradient fill button */}
                    <li>
                      <GradientButton
                        isLink={true}
                        linkHref="/auth/signup"
                        text="Get your pass"
                      />
                    </li>
                  </>
                )}
              </ul>
            </nav>

            {/* ── Mobile: hamburger ── */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 text-zinc-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm transition-colors"
            >
              <span
                className={`block w-5 h-px bg-current transition-all duration-200 ${mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""}`}
              />
              <span
                className={`block w-5 h-px bg-current transition-all duration-200 ${mobileOpen ? "opacity-0" : ""}`}
              />
              <span
                className={`block w-5 h-px bg-current transition-all duration-200 ${mobileOpen ? "-rotate-45 translate-y-[-3.5px]" : ""}`}
              />
            </button>
          </nav>
        </div>

        {/* ── Mobile menu drawer ── */}
        <section
          id="mobile-menu"
          aria-label="Mobile navigation"
          className={`md:hidden border-t border-zinc-800 bg-zinc-950 overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? "max-h-125 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <nav className="px-4 pt-4 pb-6 space-y-1">
            <ul className="list-none p-0 space-y-0.5" role="list">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={label}>
                  {/* TODO: Add navigation later */}
                  <Link
                    href={href}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
                  >
                    <span
                      aria-hidden="true"
                      className="w-1 h-1 rounded-full bg-zinc-600 shrink-0"
                    />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Divider */}
            <hr className="border-zinc-800 my-3" />

            {/* Live events */}
            {/* TODO: Add navigation later */}
            <Link
              href="#"
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-mono text-emerald-400 hover:bg-zinc-800/60 transition-all duration-150 rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span
                aria-hidden="true"
                className="relative flex h-1.5 w-1.5 shrink-0"
              >
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              Live events now
            </Link>

            {/* Auth actions */}
            {currentUser ? (
              <>
                {/* Profile links */}
                <menu className="list-none p-0 m-0 space-y-0.5">
                  {[
                    "My Tickets",
                    "My Listings",
                    "Order History",
                    "Settings",
                  ].map((label) => (
                    <li key={label}>
                      {/* TODO: Add navigation later */}
                      <Link
                        href="#"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
                      >
                        <span
                          aria-hidden="true"
                          className="w-1 h-1 rounded-full bg-violet-600 shrink-0"
                        />
                        {label}
                      </Link>
                    </li>
                  ))}
                </menu>{" "}
                <hr className="border-zinc-800 my-3" />
                {/* Sign out */}
                <button
                  type="button"
                  onClick={signOutHandler}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-sm"
                >
                  <svg
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <menu className="list-none p-0 m-0 pt-2 flex flex-col gap-2">
                  <li>
                    <Link
                      href="/auth/signin"
                      className="flex items-center justify-center px-4 py-2.5 text-sm font-bold text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
                    >
                      Sign in
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/auth/signup"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-black text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-sm"
                    >
                      Get your pass
                    </Link>
                  </li>
                </menu>
              </>
            )}
          </nav>
        </section>

        {/* ── Bottom decorative perforation strip ── */}
        <aside
          aria-hidden="true"
          className="w-full overflow-hidden h-2 flex items-end"
        >
          <ol className="flex w-full justify-between px-3 list-none p-0">
            {[...Array(80)].map((_, i) => (
              <li
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-zinc-800/70 shrink-0"
              />
            ))}
          </ol>
        </aside>
      </header>
    </>
  );
}
