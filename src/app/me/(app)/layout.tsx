import Link from "next/link";
import { LogOut, Trophy } from "lucide-react";
import { requireMember } from "@/lib/memberSession";
import { memberLogout } from "../actions";
import { MemberTabs } from "./MemberTabs";

export const metadata = { title: "My club · The Champions Club" };

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  return (
    <div className="mx-auto min-h-screen max-w-[560px] bg-cream pb-24">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-cream/95 px-4 backdrop-blur">
        <Link href="/me" className="flex items-center gap-2 text-forest">
          <span className="grid size-8 place-items-center rounded-full bg-forest text-cream">
            <Trophy className="size-4" strokeWidth={1.9} />
          </span>
          <span className="font-serif text-[17px] font-medium">The Champions Club</span>
        </Link>
        <form action={memberLogout}>
          <button type="submit" aria-label={`Sign out ${member.name}`} className="grid size-10 place-items-center text-muted hover:text-forest">
            <LogOut className="size-[18px]" />
          </button>
        </form>
      </header>
      <main className="px-4 pt-5">{children}</main>
      <MemberTabs />
    </div>
  );
}
