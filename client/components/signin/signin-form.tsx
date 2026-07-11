"use client";

import { useRequest } from "@/hooks/use-request";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import ForgotPasswordLink from "../ui/forgot-password-link";
import FormField from "../ui/form-field";
import GradientButton from "../ui/gradient-button";
import EmailIcon from "../ui/icons/email-svg";
import LockIcon from "../ui/icons/lock-svg";

export default function SignInForm() {
  const searchParams = useSearchParams();
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
    <>
      <form className="px-8 pt-7 pb-6 space-y-5" onSubmit={onFormSubmitHandler}>
        {errors &&
          errors.map((err, i) => {
            return (
              <div key={i} className="text-red-500 w-full">
                {err.message}
              </div>
            );
          })}
        {/* Email */}
        <FormField
          label="Email Address"
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          hasError={
            errorFields.includes("email") || errorFields.includes("credentials")
          }
          icon={<EmailIcon />}
        />

        {/* Password */}
        <FormField
          label="Password"
          name="password"
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          hasError={
            errorFields.includes("password") ||
            errorFields.includes("credentials")
          }
          icon={<LockIcon />}
          rightLabel={<ForgotPasswordLink />}
          labelClassName="flex items-center justify-between mt-2"
          inputClassName="tracking-widest"
        />

        {/* Submit button */}
        <GradientButton text="Sign in" type="submit" isLink={false} />

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
            href={`/auth/signup${searchParams.get("returnTo") ? `?returnTo=${searchParams.get("returnTo")}` : ""}`}
            className="text-violet-400 hover:text-white font-semibold transition-colors duration-150"
          >
            Create an account
          </Link>
        </p>
      </form>
    </>
  );
}
