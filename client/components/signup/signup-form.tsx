"use client";

import { useState, type SyntheticEvent } from "react";
import { useRequest } from "@/hooks/use-request";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { doRequest, errors, errorFields } = useRequest({
    url: "/api/users/signup",
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
    <form className="px-8 py-8 space-y-5" onSubmit={onFormSubmitHandler}>
      <p className="text-zinc-400 leading-relaxed">
        Join thousands buying &amp; selling tickets for concerts, sports,
        theatre, and more.
      </p>
      {errors}

      {/* Email field */}
      <fieldset className="space-y-1.5 border-none p-0 m-0">
        <label
          htmlFor="email"
          className="block text-sm font-mono font-semibold tracking-widest text-zinc-400 uppercase"
        >
          Email Address
        </label>
        <span className="relative group flex items-center">
          <svg
            aria-hidden="true"
            className="absolute left-3.5 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={`w-full bg-zinc-800/60 border text-zinc-100 placeholder-zinc-600 rounded-none pl-10 pr-4 py-3 text-sm focus:outline-none  focus:ring-1 focus:ring-violet-500/50 focus:bg-zinc-800 transition-all duration-200 ${errorFields.includes("email") ? "border-red-500" : "border-zinc-700 focus:border-violet-500"}`}
          />
        </span>
      </fieldset>

      {/* Password field */}
      <fieldset className="space-y-1.5 border-none p-0 m-0 mt-2">
        <label
          htmlFor="password"
          className="block text-sm font-mono font-semibold tracking-widest text-zinc-400 uppercase"
        >
          Password
        </label>
        <span className="relative group flex items-center">
          <svg
            aria-hidden="true"
            className="absolute left-3.5 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors duration-200 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <input
            type="password"
            name="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 4 characters"
            autoComplete="new-password"
            className={`w-full bg-zinc-800/60 border text-zinc-100 placeholder-zinc-600 rounded-none pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:bg-zinc-800 transition-all duration-200 ${errorFields.includes("password") ? "border-red-500" : "border-zinc-700 focus:border-violet-500"}`}
          />
        </span>
      </fieldset>

      {/* Terms checkbox */}
      <label
        htmlFor="terms"
        className="flex items-start gap-3 pt-1 cursor-pointer"
      >
        <span className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            id="terms"
            name="terms"
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
        <small className="text-sm text-zinc-500 leading-relaxed not-italic">
          I agree to the{" "}
          <Link
            href="#"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="#"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </Link>
        </small>
      </label>

      {/* Submit */}
      <button
        type="submit"
        className="w-full mt-2 py-3.5 px-6 bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.99] text-white font-black text-sm tracking-widest uppercase transition-all duration-200 relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          Get My Pass
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

      {/* OR divider */}
      <p
        role="separator"
        aria-hidden="true"
        className="flex items-center gap-3 py-1 text-zinc-600 text-sm font-mono before:flex-1 before:h-px before:bg-zinc-800 after:flex-1 after:h-px after:bg-zinc-800"
      >
        OR
      </p>

      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/auth/signin"
          className="text-violet-400 hover:text-white font-semibold transition-colors duration-150"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
