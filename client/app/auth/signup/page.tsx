"use client";

import SignUpForm from "@/components/signup/signup-form";
import TicketIcon from "@/components/ui/icons/ticket-svg";
import Perforations from "@/components/ui/perforations";
import TicketFooter from "@/components/ui/ticket-footer";

export default function SignupPage() {
  return (
    <>
      <main className="h-full bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorative blobs */}
        <aside
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <span className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
          <span className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-3xl" />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full bg-violet-900/10 blur-3xl" />
          {/* Decorative ticket grid — top-left */}
          <figure className="absolute top-8 left-8 opacity-10">
            {[...Array(4)].map((_, i) => (
              <ul key={i} className="mb-3 flex gap-3 list-none p-0">
                {[...Array(6)].map((_, j) => (
                  <li
                    key={j}
                    className="w-12 h-6 rounded-sm border border-violet-400 relative"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-950 border border-violet-400" />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-zinc-950 border border-violet-400" />
                  </li>
                ))}
              </ul>
            ))}
          </figure>
          {/* Decorative ticket grid — bottom-right */}
          <figure className="absolute bottom-8 right-8 opacity-10 rotate-12">
            {[...Array(3)].map((_, i) => (
              <ul key={i} className="mb-3 flex gap-3 list-none p-0">
                {[...Array(5)].map((_, j) => (
                  <li
                    key={j}
                    className="w-12 h-6 rounded-sm border border-fuchsia-400 relative"
                  >
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-zinc-950 border border-fuchsia-400" />
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 rounded-full bg-zinc-950 border border-fuchsia-400" />
                  </li>
                ))}
              </ul>
            ))}
          </figure>
        </aside>

        {/* Ticket card */}
        <article className="relative w-full max-w-md">
          {/* Perforated top edge */}
          <ol
            aria-hidden="true"
            className="flex justify-between px-2 list-none p-0"
          >
            {[...Array(22)].map((_, i) => (
              <li
                key={i}
                className="w-2 h-2 rounded-full bg-fuchsia-600 -mb-1"
              />
            ))}
          </ol>

          <section className="bg-zinc-900 border border-zinc-800/80 shadow-2xl shadow-violet-950/30">
            {/* Ticket header */}
            <header className="bg-linear-to-r from-violet-600 via-fuchsia-600 to-violet-600 px-8 py-5 relative overflow-hidden">
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]"
              />
              <div className="relative flex items-center justify-between">
                <hgroup>
                  <p className="flex items-center gap-2 mb-1">
                    <TicketIcon customClass="w-5 h-5 text-white/80" />
                    <span className="text-white/60 text-[14px] font-mono tracking-widest uppercase">
                      Venue Pass
                    </span>
                  </p>
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    Create Account
                  </h1>
                </hgroup>
                <aside aria-label="Ticket number" className="text-right">
                  <p className="text-white/40 text-[12px] font-mono">ADM</p>
                  <p className="text-white font-mono font-bold text-lg">
                    ✦ 001
                  </p>
                </aside>
              </div>
            </header>

            {/* Tear-line divider */}
            <hr
              aria-hidden="true"
              className="relative border-none flex items-center my-0 h-0 overflow-visible before:absolute before:-left-6 before:w-6 before:h-6 before:rounded-full before:bg-zinc-950 after:absolute after:-right-6 after:w-6 after:h-6 after:rounded-full after:bg-zinc-950 mx-3 border-t border-zinc-700"
            />
            {/* Visible dashed line (hr pseudo-elements can't flex, so we use a presentational span) */}
            <span
              aria-hidden="true"
              className="block mx-6 border-t border-dashed border-zinc-700 -mt-px"
            />

            {/* Form body */}
            <SignUpForm />

            {/* Ticket footer */}
            <TicketFooter footerExtraText="SEC A · ROW 1" />
          </section>

          {/* Perforated bottom edge */}
          <Perforations count={22} className="px-2 justify-between -mt-1" />
        </article>
      </main>
    </>
  );
}
