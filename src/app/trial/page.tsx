import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/dates";
import { SubpageHeader } from "@/components/landing/Navbar";
import { TrialForm } from "./TrialForm";

export const metadata = {
  title: "Book a free trial · The Champions Club",
  description: "Try an hour on court free, or ask us about Gold, Silver and Junior memberships.",
};

type Search = { interest?: string; date?: string; time?: string; court?: string; plan?: string; sport?: string };

export default async function TrialPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const court = sp.court ? await db.court.findUnique({ where: { id: Number(sp.court) || 0 } }) : null;
  const interest = sp.interest === "membership" ? "membership" : "trial";
  const plans = await db.plan.findMany({
    where: { active: true },
    orderBy: { monthlyFee: "desc" },
    select: { name: true, monthlyFee: true, durationDays: true, description: true },
  });

  return (
    <div className="min-h-screen">
      <SubpageHeader
        right={
          <Link href="/courts" className="font-semibold text-forest">
            See free courts
          </Link>
        }
      />
      <main className="mx-auto grid max-w-[1280px] items-stretch gap-8 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-2">
        <div className="relative flex min-h-[420px] items-end overflow-hidden rounded-3xl p-[22px] lg:min-h-[560px]">
          <Image
            src="/images/tennis-court.jpg"
            alt="Floodlit tennis court with umpire chair"
            fill
            priority
            unoptimized
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-[50%_55%]"
          />
          <div className="relative grid gap-3.5 rounded-[18px] border border-white/25 bg-forest-deep/55 p-7 text-white backdrop-blur-[14px]">
            <h1 className="text-[clamp(36px,4vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              {interest === "membership" ? (
                <>
                  Join the <span className="font-serif font-medium italic text-ball">club</span>
                </>
              ) : (
                <>
                  Your first hour is <span className="font-serif font-medium italic text-ball">on us</span>
                </>
              )}
            </h1>
            <ul className="grid gap-2.5 text-[16.5px]">
              <li>✓ A free 1-hour session with equipment</li>
              <li>✓ The desk calls you back within a day</li>
              <li>✓ Help choosing a plan, family and corporate quotes too</li>
            </ul>
          </div>
        </div>
        <div className="grid content-start gap-[18px] rounded-3xl border border-line bg-paper p-6 sm:p-9">
          <TrialForm
            defaults={{
              interest,
              date: sp.date,
              time: sp.time,
              courtId: court ? String(court.id) : undefined,
              plan: sp.plan,
              sport: court?.sport ?? (sp.sport === "cricket" ? "cricket" : undefined),
            }}
            courtName={court?.name}
            plans={plans}
            minDate={isoDate(new Date())}
          />
        </div>
      </main>
    </div>
  );
}
