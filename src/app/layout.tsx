import type { Metadata } from "next";
import { Caveat, Fraunces, Figtree } from "next/font/google";
import "./globals.css";
import { ScrollReveal } from "@/components/ScrollReveal";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

const script = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "The Champions Club",
  description: "Tennis and cricket courts, memberships, a gear shop and a café. Find an open court and book a trial.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${script.variable} antialiased`}>
        <ScrollReveal />
        {children}
      </body>
    </html>
  );
}
