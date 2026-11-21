"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/staff/money", label: "Overview" },
  { href: "/staff/money/bills", label: "Bills" },
  { href: "/staff/money/payroll", label: "Payroll" },
  { href: "/staff/money/invoices", label: "Invoices" },
  { href: "/staff/money/staff-invoices", label: "Staff invoices" },
  { href: "/staff/money/gst", label: "GST" },
  { href: "/staff/money/close", label: "Daily close" },
  { href: "/staff/money/checks", label: "Books check" },
];

export function MoneyTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Income" className="flex flex-wrap border-[1.5px] border-forest">
      {tabs.map((t) => {
        const on = t.href === "/staff/money" ? pathname === t.href : pathname.startsWith(t.href);
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
