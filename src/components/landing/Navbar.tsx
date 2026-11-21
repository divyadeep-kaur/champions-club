"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/courts", label: "Courts" },
  { href: "/#memberships", label: "Memberships" },
  { href: "/#sports", label: "Sports" },
  { href: "/#coaches", label: "Coaches" },
  { href: "/#shop", label: "Shop" },
  { href: "/#reviews", label: "Reviews" },
];

const signIns = [
  { href: "/me/login", label: "Member", hint: "Book courts, order from the café" },
  { href: "/staff/login", label: "Staff", hint: "Front desk and bar" },
  { href: "/staff/login?as=admin", label: "Admin", hint: "Owner: reports and everything else" },
];

export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return <Image src="/brand/logo-mark.png" alt="" width={size} height={size} priority unoptimized className={`shrink-0 ${className}`} />;
}

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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="min-h-11 rounded-full border-[1.5px] border-line px-4 py-2.5 text-[15px] font-bold text-ink transition-colors hover:border-forest"
      >
        Sign in ▾
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[52px] z-10 grid w-[290px] rounded-2xl border border-line bg-paper/90 p-2 text-left shadow-[0_20px_50px_rgba(11,42,29,0.18)] backdrop-blur-xl"
        >
          {signIns.map((s) => (
            <Link key={s.label} role="menuitem" href={s.href} className="rounded-[10px] p-3 text-ink hover:bg-cream">
              <strong className="block text-forest">{s.label}</strong>
              <span className="text-[13.5px] text-muted">{s.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Champions Club home">
          <LogoMark size={44} />
          <span className="text-[20px] font-extrabold italic tracking-[-0.01em] text-[#111111]">
            CHAMPI<span className="text-[#5f6b3a]">O</span>NS CLUB
          </span>
        </Link>

        <nav aria-label="Main" className="hidden flex-wrap gap-7 text-[15.5px] font-semibold lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ink hover:text-forest">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <SignInMenu />
          </div>
          <Link href="/trial" className="hidden rounded-full bg-ball px-5 py-3 text-[15px] font-bold text-forest-deep transition-colors hover:bg-[#b6dd45] sm:inline-block">
            Book a free trial
          </Link>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full border-[1.5px] border-line text-forest lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-paper px-4 pb-4 pt-2 lg:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-[10px] px-3 py-3 text-[16px] font-semibold text-ink hover:bg-cream">
              {l.label}
            </Link>
          ))}
          <p className="mt-2 border-t border-line px-3 pb-1 pt-3 text-[12.5px] font-bold uppercase tracking-[0.1em] text-muted">Sign in as</p>
          {signIns.map((s) => (
            <Link key={s.label} href={s.href} className="block rounded-[10px] px-3 py-2.5 text-[15px] hover:bg-cream">
              <strong className="text-forest">{s.label}</strong> <span className="text-muted">· {s.hint}</span>
            </Link>
          ))}
          <Link href="/trial" className="mt-3 block rounded-full bg-ball px-5 py-3 text-center text-[15px] font-bold text-forest-deep">
            Book a free trial
          </Link>
        </nav>
      )}
    </header>
  );
}

export function SubpageHeader({ right }: { right: React.ReactNode }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="text-[20px] font-extrabold text-forest">
          ← Champions Club
        </Link>
        <div className="flex items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
