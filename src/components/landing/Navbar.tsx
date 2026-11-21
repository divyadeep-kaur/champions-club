"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Menu, ShieldCheck, Trophy, UserRound, UsersRound, X } from "lucide-react";

const links = ["Courts", "Memberships", "Shop", "Café & Bar"];

const signIns = [
  { href: "/me/login", label: "Member", hint: "Book courts, order from the café", icon: UserRound },
  { href: "/staff/login", label: "Staff", hint: "Front desk and bar", icon: UsersRound },
  { href: "/staff/login?as=admin", label: "Admin", hint: "Owner: reports and everything else", icon: ShieldCheck },
];

function SignInMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 bg-forest px-4 py-2.5 text-[14.5px] font-semibold text-cream transition-colors hover:bg-forest-deep"
      >
        Sign in
        <ChevronDown className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-[calc(100%+8px)] w-[290px] origin-top-right border border-forest/20 bg-paper p-1.5 shadow-[0_18px_40px_-18px_rgba(11,42,29,0.45)]"
          >
            {signIns.map(({ href, label, hint, icon: Icon }) => (
              <a key={label} role="menuitem" href={href} className="group flex items-center gap-3 px-3 py-2.5 hover:bg-cream">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink">{label}</span>
                  <span className="block text-[13px] text-muted">{hint}</span>
                </span>
                <ArrowUpRight className="size-4 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest" />
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-30 mx-auto max-w-[1320px] px-4 sm:px-8">
      <div className="flex h-[76px] items-center justify-between border-b-[1.5px] border-forest">
        <a href="#" className="flex items-center gap-3.5" aria-label="The Champions Club home">
          <span className="grid size-10 place-items-center rounded-full bg-forest text-cream">
            <Trophy className="size-[19px]" strokeWidth={1.8} />
          </span>
          <span className="h-8 w-px bg-forest/40" aria-hidden="true" />
          <span className="font-serif text-[22px] font-medium tracking-[-0.01em] text-forest sm:text-[24px]">
            The Champions Club
          </span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-10 lg:flex">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="relative py-1 text-[15.5px] font-medium text-ink after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-forest after:transition-transform after:duration-300 hover:after:scale-x-100"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SignInMenu />
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="ml-3 grid size-10 place-items-center rounded-full border border-forest/30 text-forest lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            aria-label="Mobile"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-x-4 top-[84px] border border-forest/20 bg-paper p-2 shadow-[0_18px_40px_-20px_rgba(11,42,29,0.45)] sm:inset-x-8 lg:hidden"
          >
            {links.map((link) => (
              <a key={link} href="#" className="block px-4 py-3 text-[16px] font-medium text-ink hover:bg-cream">
                {link}
              </a>
            ))}
            <p className="mt-1 border-t border-line px-4 pb-1 pt-3 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-muted sm:hidden">Sign in as</p>
            {signIns.map(({ href, label, hint }) => (
              <a key={label} href={href} className="flex items-center justify-between px-4 py-2.5 text-[15px] font-medium text-forest hover:bg-cream sm:hidden">
                <span>
                  {label} <span className="font-normal text-muted">· {hint}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0" />
              </a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
