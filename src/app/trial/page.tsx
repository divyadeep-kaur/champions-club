import { db } from "@/lib/db";
import { isoDate } from "@/lib/dates";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { TrialForm } from "./TrialForm";

export const metadata = {
  title: "Book a trial · The Champions Club",
  description: "Try an hour on court free, or ask us about Gold, Silver and Junior memberships.",
};

type Search = { interest?: string; date?: string; time?: string; court?: string; plan?: string };

export default async function TrialPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const court = sp.court ? await db.court.findUnique({ where: { id: Number(sp.court) || 0 } }) : null;
  const interest = sp.interest === "membership" || sp.interest === "other" ? sp.interest : "trial";

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />
      <section className="mx-auto grid max-w-[1320px] gap-10 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
        <div>
          <h1 className="font-serif text-[52px] font-semibold leading-[0.95] tracking-[-0.035em] text-forest sm:text-[72px]">
            {interest === "membership" ? (
              <>
                Join the
                <br />
                <em className="font-medium">club.</em>
              </>
            ) : (
              <>
                Your first hour
                <br />
                <em className="font-medium">is on us.</em>
              </>
            )}
          </h1>
          <p className="mt-6 max-w-[420px] text-[18px] leading-relaxed text-ink">
            Tell us when you’d like to play. The front desk calls you back to confirm, sets you up with a coach and lends you a racket if you need one.
          </p>
          <ul className="mt-8 space-y-3 border-t border-line pt-6 text-[15.5px] text-ink">
            <li>Open every day, 6 am to 11 pm</li>
            <li>Tennis courts and cricket nets</li>
            <li>Shop and café right by the courts</li>
          </ul>
        </div>
        <TrialForm
          defaults={{ interest, date: sp.date, time: sp.time, courtId: court ? String(court.id) : undefined, plan: sp.plan }}
          courtName={court?.name}
          minDate={isoDate(new Date())}
        />
      </section>
      <Footer />
    </main>
  );
}
