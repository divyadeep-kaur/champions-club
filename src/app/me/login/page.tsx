import Image from "next/image";
import Link from "next/link";
import { MemberLoginForm } from "./MemberLoginForm";

export const metadata = { title: "Member sign in · The Champions Club" };

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-forest-deep">
      <Image src="/images/tennis-court.jpg" alt="" aria-hidden="true" fill priority unoptimized sizes="100vw" className="object-cover object-[45%_40%]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,42,29,0.15)_0%,rgba(11,42,29,0.75)_60%)]" />
      <div className="relative mx-auto flex min-h-[100svh] max-w-[480px] flex-col justify-between gap-10 p-6">
        <Link
          href="/"
          aria-label="Champions Club home"
          className="flex items-center gap-2 self-start rounded-full border border-white/50 bg-white/85 py-1.5 pl-1.5 pr-4 text-[16px] font-extrabold italic text-[#111111] backdrop-blur-md"
        >
          <Image src="/brand/logo-mark.png" alt="" width={48} height={48} unoptimized />
          CHAMPI<span className="text-[#5f6b3a]">O</span>NS CLUB
        </Link>
        <MemberLoginForm next={next} />
      </div>
    </main>
  );
}
