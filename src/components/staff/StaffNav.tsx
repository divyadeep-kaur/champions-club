"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ChefHat,
  Coffee,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
  Trophy,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: Users,
  bookings: CalendarDays,
  shop: ShoppingBag,
  bar: Coffee,
  kitchen: ChefHat,
  leads: UserPlus,
};

type Item = { href: string; label: string; icon: string };

function Links({ items, onNavigate }: { items: Item[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon }) => {
        const Icon = icons[icon];
        const active = href === "/staff" ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 p-3 text-[15px] transition-colors ${
                active ? "bg-ball font-semibold text-forest-deep" : "text-cream hover:bg-white/5"
              }`}
            >
              <Icon className="size-[18px] lg:hidden" strokeWidth={1.9} />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Brand() {
  return (
    <Link href="/staff" className="flex items-center gap-2.5 px-3 text-cream">
      <Trophy className="size-[18px] text-ball lg:hidden" strokeWidth={2} />
      <span className="font-serif text-[21px] leading-tight">Champions Club</span>
    </Link>
  );
}

function User({ name, role, logout }: { name: string; role: string; logout: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-cream/20 px-3 pt-5">
      <div className="min-w-0">
        <p className="truncate text-[14px] text-cream">{name}</p>
        <p className="text-[14px] capitalize text-cream/75">{role === "desk" ? "Front desk" : role}</p>
      </div>
      <form action={logout}>
        <button type="submit" aria-label="Sign out" className="grid size-9 place-items-center text-cream/70 transition-colors hover:bg-white/10 hover:text-cream">
          <LogOut className="size-[18px]" />
        </button>
      </form>
    </div>
  );
}

export function StaffNav({ items, name, role, logout }: { items: Item[]; name: string; role: string; logout: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col bg-forest px-4 py-6 lg:flex">
        <Brand />
        <nav aria-label="Staff" className="mt-5 flex-1">
          <Links items={items} />
        </nav>
        <User name={name} role={role} logout={logout} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-forest px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-10 place-items-center text-cream"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        {open && (
          <div className="absolute inset-x-0 top-14 space-y-4 bg-forest px-4 pb-5 pt-2 shadow-xl">
            <Links items={items} onNavigate={() => setOpen(false)} />
            <User name={name} role={role} logout={logout} />
          </div>
        )}
      </header>
    </>
  );
}
