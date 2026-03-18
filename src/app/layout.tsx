import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { MonitoringProvider } from "@/components/monitoring-provider";
import "./globals.css";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasClerk = clerkKey && !clerkKey.includes("REPLACE_ME");

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlotCraft",
  description: "SaaS platform for iGaming game design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        <MonitoringProvider>{children}</MonitoringProvider>
      </body>
    </html>
  );

  if (!hasClerk) return content;

  // Dynamic import to avoid errors when Clerk keys aren't set
  const { ClerkProvider } = require("@clerk/nextjs");
  return <ClerkProvider>{content}</ClerkProvider>;
}
