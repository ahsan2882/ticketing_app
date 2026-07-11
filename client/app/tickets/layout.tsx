import React from "react";

export default function TicketLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-zinc-950 h-full relative overflow-y-auto scroll-smooth">
      <div className="max-w-6xl mx-auto px-6 py-14">{children}</div>
    </div>
  );
}
