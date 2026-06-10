import Header from "@/components/header/header";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VenuePass - Buy & Sell Event Tickets",
  description:
    "The marketplace for live event tickets. Buy, sell, and never miss a show.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { currentUser } = await getCurrentUser();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <Header currentUser={currentUser} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
