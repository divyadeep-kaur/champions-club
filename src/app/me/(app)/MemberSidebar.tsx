"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Coffee, Home, LogOut, ShoppingBag } from "lucide-react";
import { memberLogout } from "../actions";

const links = [
  { href: "/me", label: "Home", Icon: Home },
  { href: "/me/book", label: "Book a court", Icon: CalendarDays },
  { href: "/me/shop", label: "Shop", Icon: ShoppingBag },
  { href: "/me/cafe", label: "Café", Icon: Coffee },
];

// Olive-green menu down the left on wider screens, matching the staff side.
// Phones keep the bottom tabs.
export function MemberSidebar({ name, plan, code }: { name: string; plan: string; code: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col bg-forest px-4 py-6 lg:flex">
      <Link href="/me" className="flex items-center gap-2.5 px-3 text-cream">
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white p-1">
          <Image src="/brand/logo-mark.png" alt="" width={48} height={48} unoptimized />
        </span>
        <span className="text-[17px] font-extrabold italic leading-tight tracking-wide">
          CHAMPI<span className="text-ball">O</span>NS CLUB
        </span>
      </Link>
      <nav aria-label="Member" className="mt-6 flex-1">
        <ul className="space-y-1">
          {links.map(({ href, label, Icon }) => {
            const active = href === "/me" ? pathname === href : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 p-3 text-[15px] transition-colors ${
                    active ? "bg-ball font-semibold text-forest-deep" : "text-cream hover:bg-white/5"
                  }`}
                >
                  <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center justify-between gap-3 border-t border-cream/20 px-3 pt-5">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-cream">{name}</p>
          <p className="text-[13.5px] text-cream/75">
            {plan} · {code}
          </p>
        </div>
        <form action={memberLogout}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="grid size-9 place-items-center text-cream/70 transition-colors hover:bg-white/10 hover:text-cream"
          >
            <LogOut className="size-[18px]" />
          </button>
        </form>
      </div>
    </aside>
  );
}
