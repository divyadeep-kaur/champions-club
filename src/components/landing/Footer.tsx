import Image from "next/image";
import Link from "next/link";

const cols = [
  {
    title: "Play",
    links: [
      { href: "/courts", label: "Free slots" },
      { href: "/#sports", label: "Tennis & cricket" },
      { href: "/trial", label: "Free trial" },
    ],
  },
  {
    title: "Club",
    links: [
      { href: "/#memberships", label: "Memberships" },
      { href: "/#shop", label: "Shop" },
      { href: "/#cafe", label: "Café & bar" },
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
    <footer className="bg-forest-deep text-cream">
      <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-8 px-4 pb-8 pt-16 text-[15px] sm:px-8">
        <div className="grid content-start gap-3">
          <span className="w-fit rounded-2xl bg-cream p-3">
            <Image src="/brand/logo-full.png" alt="Champions Club: Play, Perform, Inspire" width={150} height={146} unoptimized />
          </span>
          <span className="leading-relaxed opacity-80">Courts, memberships, shop and café, all in one place.</span>
          <span className="opacity-80">Open 6am–11pm daily</span>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title} className="grid content-start gap-2.5">
            <strong>{c.title}</strong>
            {c.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-cream opacity-85 hover:underline hover:opacity-100">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-4 border-t border-cream/15 px-4 pb-8 pt-5 text-[13.5px] opacity-75 sm:px-8">
        <span>© {new Date().getFullYear()} The Champions Club</span>
        <span>Privacy · Terms</span>
      </div>
    </footer>
  );
}
