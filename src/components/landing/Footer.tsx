import Image from "next/image";
import Link from "next/link";
import { ArrowUp, ArrowUpRight, Clock, Mail } from "lucide-react";
import { CLOSE_HOUR, OPEN_HOUR } from "@/lib/constants";

const cols = [
  {
    title: "Play",
    links: [
      { href: "/courts", label: "Free slots" },
      { href: "/#sports", label: "Tennis & cricket" },
      { href: "/#coaches", label: "Coaches" },
      { href: "/trial", label: "Free trial" },
    ],
  },
  {
    title: "Club",
    links: [
      { href: "/#memberships", label: "Memberships" },
      { href: "/#shop", label: "Pro shop" },
      { href: "/#cafe", label: "Café & bar" },
      { href: "/#reviews", label: "Reviews" },
    ],
  },
  {
    title: "Sign in",
    links: [
      { href: "/me/login", label: "Members" },
      { href: "/staff/login", label: "Staff" },
      { href: "/staff/login?as=admin", label: "Admin" },
    ],
  },
];

const emails = ["jashanpreetsing78147@gmail.com", "officialdivyadeep@gmail.com"];

export function Footer() {
  const hour = new Date().getHours();
  const open = hour >= OPEN_HOUR && hour < CLOSE_HOUR;

  return (
    <footer className="relative overflow-hidden bg-forest-deep text-cream">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-40 size-[420px] rounded-full bg-ball/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1280px] gap-12 px-4 pt-16 pb-10 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)] lg:gap-16 lg:pt-20">
        <div className="grid content-start gap-5">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="grid size-14 place-items-center rounded-2xl bg-cream p-1.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
              <Image src="/brand/logo-mark.png" alt="" width={48} height={48} unoptimized />
            </span>
            <span className="text-[20px] font-extrabold italic tracking-tight">
              CHAMPI<span className="text-ball">O</span>NS CLUB
            </span>
          </Link>
          <p className="max-w-[340px] text-[15px] leading-relaxed text-cream/75">
            Tennis courts, cricket nets, memberships, a pro shop and a café. One club, run from one desk.
          </p>
          <p className="flex w-fit items-center gap-2 rounded-full border border-cream/15 bg-white/5 px-3.5 py-2 text-[14px]">
            <span className={`size-2 rounded-full ${open ? "bg-ball shadow-[0_0_0_4px_rgba(168,210,52,0.18)]" : "bg-clay"}`} />
            <Clock className="size-4 text-cream/70" />
            {open ? "Open now" : "Closed now"} · daily {OPEN_HOUR} am – {CLOSE_HOUR - 12} pm
          </p>
          <div className="grid gap-1.5">
            {emails.map((e) => (
              <a key={e} href={`mailto:${e}`} className="flex w-fit min-w-0 items-center gap-2 break-all text-[14.5px] text-cream/80 hover:text-cream">
                <Mail className="size-4 shrink-0 text-ball" />
                {e}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-2.5 pt-1">
            <Link
              href="/trial"
              className="inline-flex items-center gap-1.5 rounded-full bg-ball px-4 py-2.5 text-[14.5px] font-bold text-forest-deep hover:brightness-105"
            >
              Book a free trial <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/courts"
              className="inline-flex items-center gap-1.5 rounded-full border border-cream/25 px-4 py-2.5 text-[14.5px] font-semibold hover:border-cream/60"
            >
              See free slots
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title} className="grid content-start gap-3">
              <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-ball">{c.title}</p>
              {c.links.map((l) => (
                <Link key={l.href} href={l.href} className="group flex w-fit items-center gap-1 text-[15px] text-cream/80 hover:text-cream">
                  <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
                    {l.label}
                  </span>
                </Link>
              ))}
            </nav>
          ))}
        </div>
      </div>

      <p
        aria-hidden
        className="relative mx-auto max-w-[1280px] select-none overflow-hidden whitespace-nowrap px-4 text-center font-extrabold italic leading-[0.85] tracking-tight text-cream/[0.06] sm:px-8"
        style={{ fontSize: "clamp(34px, 10.5vw, 150px)" }}
      >
        CHAMPIONS CLUB
      </p>

      <div className="relative border-t border-cream/10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13.5px] text-cream/60 sm:px-8">
          <span>© {new Date().getFullYear()} The Champions Club</span>
          <span className="tracking-[0.14em] uppercase">Play · Perform · Inspire</span>
          <a href="#" className="inline-flex items-center gap-1.5 text-cream/80 hover:text-cream">
            Back to top <ArrowUp className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
