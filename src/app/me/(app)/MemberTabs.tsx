"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/me", label: "Home" },
  { href: "/me/book", label: "Book" },
  { href: "/me/shop", label: "Shop" },
  { href: "/me/cafe", label: "Café" },
];

export function MemberTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Member" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper lg:hidden">
      <ul className="mx-auto grid max-w-[560px] grid-cols-4">
        {tabs.map(({ href, label }) => {
          const active = href === "/me" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block border-t-[3px] pb-[18px] pt-3.5 text-center ${active ? "border-forest font-extrabold text-forest" : "border-transparent font-semibold text-muted"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
