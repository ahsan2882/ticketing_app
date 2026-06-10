"use client";

import { ButtonProps } from "@/models/button.model";
import Link from "next/link";

export default function GradientButton({
  type,
  isLink,
  text,
  linkHref,
}: ButtonProps) {
  return (
    <>
      {isLink && linkHref ? (
        <Link
          href={linkHref}
          className="relative overflow-hidden flex items-center gap-2 px-5 py-2 text-sm font-black text-white bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 group"
        >
          <span className="relative z-10">{text}</span>
          <svg
            aria-hidden="true"
            className="relative z-10 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-150"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M13 7l5 5m0 0l-5 5m5-5H6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12"
          />
        </Link>
      ) : (
        type && (
          <button
            type={type}
            className="relative w-full py-3.5 px-6 group overflow-hidden bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.99] text-white font-black text-sm tracking-widest uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 mt-2"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {text}
              <svg
                aria-hidden="true"
                className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12"
            />
          </button>
        )
      )}
    </>
  );
}
