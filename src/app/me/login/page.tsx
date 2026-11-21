import Link from "next/link";
import { Trophy } from "lucide-react";
import { MemberLoginForm } from "./MemberLoginForm";

export const metadata = { title: "Member sign in · The Champions Club" };

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-[440px] flex-col px-5 py-8">
      <Link href="/" className="flex items-center gap-2.5 text-forest">
        <span className="grid size-9 place-items-center rounded-full bg-forest text-cream">
          <Trophy className="size-[17px]" strokeWidth={1.8} />
        </span>
        <span className="font-serif text-[19px] font-medium">The Champions Club</span>
      </Link>
      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="font-serif text-[42px] font-semibold leading-[1] tracking-[-0.03em] text-forest">
          Hello,
          <br />
          <em className="font-medium">member.</em>
        </h1>
        <p className="mt-3 text-[16px] text-muted">Book courts and order from the café on your phone.</p>
        <MemberLoginForm next={next} />
        <p className="mt-8 text-[14px] text-muted">
          Not a member yet?{" "}
          <Link href="/" className="font-semibold text-forest underline underline-offset-4">
            See plans and book a trial
          </Link>
        </p>
      </div>
    </main>
  );
}
