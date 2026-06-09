"use client";

import { useState, type SyntheticEvent } from "react";
import { useRequest } from "@/hooks/use-request";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { doRequest, errors, errorFields } = useRequest({
    url: "/api/users/signin",
    method: "post",
    body: {
      email,
      password,
    },
    onSuccess: (res) => {
      console.log({ res });
      router.push("/");
      router.refresh();
    },
  });

  const onFormSubmitHandler = async (
    event: SyntheticEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    await doRequest();
  };

  return (
    <>
      <form className="px-8 pt-7 pb-6 space-y-5" onSubmit={onFormSubmitHandler}>
        {errors}
        {/* Email */}
        <fieldset className="border-none p-0 m-0">
          <label
            htmlFor="email"
            className="block text-[14px] font-mono font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2"
          >
            Email Address
          </label>
          <span
            className={`relative group flex items-center bg-zinc-800/50 border focus-within:ring-1 focus-within:ring-violet-500/40 transition-all duration-200 ${errorFields.includes("email") ? "border-red-500" : "border-zinc-700 focus-within:border-violet-500"}`}
          >
            <svg
              aria-hidden="true"
              className="absolute left-3.5 w-4 h-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              type="email"
              id="email"
              name="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-600 pl-10 pr-4 py-3 text-sm focus:outline-none"
            />
          </span>
        </fieldset>

        {/* Password */}
        <fieldset className="border-none p-0 m-0 mt-2">
          <label
            htmlFor="password"
            className="flex items-center justify-between text-[14px] font-mono font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2"
          >
            Password
            <Link
              href="#"
              className="text-violet-500 hover:text-violet-300 normal-case tracking-normal font-sans font-medium transition-colors"
            >
              Forgot?
            </Link>
          </label>
          <span
            className={`relative group flex items-center bg-zinc-800/50 border focus-within:ring-1 focus-within:ring-violet-500/40 transition-all duration-200 ${errorFields.includes("password") ? "border-red-500" : "border-zinc-700 focus-within:border-violet-500"}`}
          >
            <svg
              aria-hidden="true"
              className="absolute left-3.5 w-4 h-4 text-zinc-600 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              type="password"
              id="password"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 pl-10 pr-4 py-3 text-sm focus:outline-none tracking-widest"
            />
          </span>
        </fieldset>

        {/* Remember me */}
        <label
          htmlFor="remember"
          className="flex items-center gap-2.5 cursor-pointer pt-0.5 mt-2"
        >
          <span className="relative shrink-0">
            <input
              type="checkbox"
              id="remember"
              name="remember"
              className="peer appearance-none w-4 h-4 border border-zinc-600 bg-zinc-800 checked:bg-violet-600 checked:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer transition-colors duration-150 rounded-sm"
            />
            <svg
              aria-hidden="true"
              className="absolute inset-0 w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3.5 8l3 3 5.5-5.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <small className="text-[14px] text-zinc-500 not-italic mb-0.5">
            Keep me signed in
          </small>
        </label>

        {/* Submit button */}
        <button
          type="submit"
          className="relative w-full py-3.5 px-6 group overflow-hidden bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.99] text-white font-black text-sm tracking-widest uppercase transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 mt-2"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            Sign In
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

        {/* OR + signup link */}
        <p
          role="separator"
          aria-hidden="true"
          className="flex items-center gap-3 text-zinc-700 text-xs font-mono before:flex-1 before:h-px before:bg-zinc-800 after:flex-1 after:h-px after:bg-zinc-800"
        >
          OR
        </p>

        <p className="text-center text-[14px] text-zinc-500">
          New to VenuePass?{" "}
          <Link
            href="/auth/signup"
            className="text-violet-400 hover:text-white font-semibold transition-colors duration-150"
          >
            Create an account
          </Link>
        </p>
      </form>
    </>
  );
}
