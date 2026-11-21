"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { memberLogout } from "../actions";

const links = [
  { href: "/me", label: "Home" },
  { href: "/me/book", label: "Book a court" },
  { href: "/me/shop", label: "Shop" },
  { href: "/me/cafe", label: "Café" },
];

export function MemberTopBar({ name, plan, code }: { name: string; plan: string; code: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 hidden border-b border-line bg-paper/90 backdrop-blur-md lg:block">
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-8 px-8">
        <Link href="/me" className="flex shrink-0 items-center gap-2.5">
          <Image src="/brand/logo-mark.png" alt="" width={44} height={44} unoptimized />
          <span className="text-[17px] font-extrabold italic text-[#111111]">
            CHAMPI<span className="text-[#5f6b3a]">O</span>NS CLUB
          </span>
        </Link>
        <nav aria-label="Member" className="flex flex-1 items-center gap-1">
          {links.map(({ href, label }) => {
            const active = href === "/me" ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-[15px] font-semibold ${active ? "bg-forest text-cream" : "text-forest hover:bg-forest/10"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight">
            <p className="text-[15px] font-semibold">{name}</p>
            <p className="text-[13px] text-muted">
              {plan} · {code}
            </p>
          </div>
          <form action={memberLogout}>
            <button type="submit" className="min-h-10 rounded-full border-[1.5px] border-forest px-4 text-[14px] font-semibold text-forest hover:bg-forest/5">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
