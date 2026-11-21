"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/staff/members", label: "Directory" },
  { href: "/staff/members/expiry", label: "Expiry tracking" },
  { href: "/staff/members/plans", label: "Plans" },
];

export function MembersTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Member management" className="flex w-fit max-w-full flex-wrap border-[1.5px] border-forest">
      {tabs.map((t) => {
        const on = t.href === "/staff/members" ? pathname === t.href || /^\/staff\/members\/(\d+|new)/.test(pathname) : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center px-4 font-semibold ${on ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
