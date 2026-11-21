"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, Coffee, IdCard } from "lucide-react";

const tabs = [
  { href: "/me", label: "My club", icon: IdCard },
  { href: "/me/book", label: "Book court", icon: CalendarPlus },
  { href: "/me/cafe", label: "Café", icon: Coffee },
];

export function MemberTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Member" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
      <ul className="mx-auto grid max-w-[560px] grid-cols-3">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/me" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[12.5px] font-semibold ${active ? "text-forest" : "text-muted"}`}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
