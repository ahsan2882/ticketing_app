"use client";

import { useRequest } from "@/hooks/use-request";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import FormField from "../ui/form-field";
import GradientButton from "../ui/gradient-button";
import EmailIcon from "../ui/icons/email-svg";
import IdentityIcon from "../ui/icons/identity-svg";
import LockIcon from "../ui/icons/lock-svg";

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { doRequest, errors, errorFields } = useRequest({
    url: "/api/users/signup",
    method: "post",
    body: {
      email,
      password,
      name: fullName,
    },
    onSuccess: (res) => {
      const returnTo = searchParams.get("returnTo");
      if (returnTo !== null) {
        router.push(returnTo);
      } else {
        router.push("/");
      }
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
      {errors &&
        errors.map((err, i) => {
          return (
            <div key={i} className="text-red-500 w-full">
              {err.message}
            </div>
          );
        })}

      {/* Name field */}
      <FormField
        label="Full Name"
        name="fullName"
        id="full-name"
        type="text"
        placeholder="Alex Morgan"
        autoComplete="name"
        value={fullName}
        onChange={setFullName}
        icon={<IdentityIcon />}
        hasError={
          errorFields.includes("name") || errorFields.includes("credentials")
        }
      />

      {/* Email field */}
      <FormField
        label="Email Address"
        name="email"
        id="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        value={email}
        onChange={setEmail}
        hasError={
          errorFields.includes("email") || errorFields.includes("credentials")
        }
        icon={<EmailIcon />}
        labelClassName="mt-2"
      />

      {/* Password field */}
      <FormField
        label="Password"
        name="password"
        id="password"
        type="password"
        placeholder="Min. 4 characters"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        hasError={
          errorFields.includes("password") ||
          errorFields.includes("credentials")
        }
        icon={<LockIcon />}
        labelClassName="mt-2"
      />

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
            required
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
          I agree to the {/* TODO: Add navigation later */}
          <Link
            href="#"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and {/* TODO: Add navigation later */}
          <Link
            href="#"
            className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </Link>
        </small>
      </label>

      {/* Submit */}
      <GradientButton text="Get my pass" type="submit" isLink={false} />

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
