import Link from "next/link";
import { Trophy } from "lucide-react";

const cols = [
  {
    title: "Play",
    links: [
      { href: "/courts", label: "Courts this week" },
      { href: "/trial", label: "Book a trial" },
      { href: "/#memberships", label: "Memberships" },
    ],
  },
  {
    title: "At the club",
    links: [
      { href: "/#shop", label: "Gear shop" },
      { href: "/#cafe", label: "Café & bar" },
      { href: "/trial?interest=other", label: "Events and coaching" },
    ],
  },
  {
    title: "Sign in",
    links: [
      { href: "/me/login", label: "Members" },
      { href: "/staff/login", label: "Staff" },
      { href: "/staff/login?as=admin", label: "Admin" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-forest text-cream">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-8 lg:grid-cols-[1.2fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-cream text-forest">
              <Trophy className="size-[19px]" strokeWidth={1.8} />
            </span>
            <span className="font-serif text-[22px] font-medium">The Champions Club</span>
          </Link>
          <p className="mt-4 max-w-[300px] text-[15px] leading-relaxed text-cream/75">Tennis, cricket nets, a gear shop and a café. Open every day, 6 am to 11 pm.</p>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-cream/60">{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-[15px]">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-cream/90 underline-offset-4 hover:text-cream hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1320px] px-4 py-5 text-[13px] text-cream/55 sm:px-8">© {new Date().getFullYear()} The Champions Club</p>
      </div>
    </footer>
  );
}
