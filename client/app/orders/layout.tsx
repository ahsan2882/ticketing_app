import React from "react";
import { getCurrentUser } from "../../lib/auth/get-current-user";
import { CurrentUserProvider } from "../../providers/current-user-context-provider";

export default async function OrderLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { currentUser } = await getCurrentUser();
  return (
    <CurrentUserProvider currentUser={currentUser ?? null}>
      <div className="bg-zinc-950 h-full relative overflow-y-auto scroll-smooth">
        <div className="max-w-6xl mx-auto px-6 py-14">{children}</div>
      </div>
    </CurrentUserProvider>
  );
}
