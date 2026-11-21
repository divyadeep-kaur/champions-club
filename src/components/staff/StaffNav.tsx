"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ROLE_LABEL } from "@/lib/nav";
import {
  CalendarDays,
  ChefHat,
  IdCard,
  MessageSquare,
  Wallet,
  IndianRupee,
  CalendarOff,
  Coffee,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBag,
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
  money: IndianRupee,
  leave: CalendarOff,
  leads: UserPlus,
  team: IdCard,
  pay: Wallet,
  queries: MessageSquare,
};

type Item = { href: string; label: string; icon: string; badge?: number };

function Links({ items, onNavigate }: { items: Item[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {items.map(({ href, label, icon, badge }) => {
        const Icon = icons[icon];
        const active = href === "/staff" ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-[background-color,color,transform] duration-200 ${
                active
                  ? "bg-ball font-semibold text-forest-deep shadow-[0_8px_20px_-10px_rgba(168,210,52,0.7)]"
                  : "text-cream/85 hover:translate-x-0.5 hover:bg-white/[0.07] hover:text-cream"
              }`}
            >
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${active ? "bg-forest-deep/10" : "bg-white/[0.06] group-hover:bg-white/[0.12]"}`}
              >
                <Icon className="size-[17px]" strokeWidth={1.9} />
              </span>
              {label}
              {badge ? (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${active ? "bg-forest-deep text-ball" : "bg-clay text-white"}`}
                  aria-label={`${badge} new`}
                >
                  {badge}
                </span>
              ) : null}
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
      <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white p-1">
        <Image src="/brand/logo-mark.png" alt="" width={48} height={48} unoptimized />
      </span>
      <span className="font-serif text-[21px] leading-tight">Champions Club</span>
    </Link>
  );
}

function User({ name, role, logout }: { name: string; role: string; logout: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-cream/20 px-3 pt-5">
      <div className="min-w-0">
        <p className="truncate text-[14px] text-cream">{name}</p>
        <p className="text-[14px] text-cream/75">{ROLE_LABEL[role] ?? role}</p>
      </div>
      <form action={logout}>
        <button
          type="submit"
          aria-label="Sign out"
          className="grid size-9 place-items-center text-cream/70 transition-colors hover:bg-white/10 hover:text-cream"
        >
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
      <aside className="cc-sidebar sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col overflow-y-auto bg-forest px-3.5 py-6 lg:flex print:hidden">
        <Brand />
        <nav aria-label="Staff" className="mt-5 flex-1">
          <Links items={items} />
        </nav>
        <User name={name} role={role} logout={logout} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-forest px-4 lg:hidden print:hidden">
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
          <div className="cc-drop absolute inset-x-0 top-14 max-h-[calc(100dvh-3.5rem)] space-y-4 overflow-y-auto bg-forest px-4 pb-5 pt-2 shadow-xl">
            <Links items={items} onNavigate={() => setOpen(false)} />
            <User name={name} role={role} logout={logout} />
          </div>
        )}
      </header>
    </>
  );
}
