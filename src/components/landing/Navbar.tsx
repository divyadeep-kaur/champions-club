"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, Trophy, X } from "lucide-react";

const links = ["Courts", "Memberships", "Shop", "Café & Bar"];

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
          <a
            href="#"
            className="group hidden items-center gap-1.5 text-[14.5px] font-medium text-ink transition-colors hover:text-forest sm:flex"
          >
            Staff sign in
            <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
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
            <a href="#" className="mt-1 flex items-center justify-between border-t border-line px-4 py-3 text-[15px] font-medium text-forest sm:hidden">
              Staff sign in
              <ArrowUpRight className="size-4" />
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
