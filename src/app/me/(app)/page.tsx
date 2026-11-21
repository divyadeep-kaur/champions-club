import Link from "next/link";
import QRCode from "qrcode";
import { CalendarPlus, CheckCircle2, Coffee } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, fmtTime } from "@/lib/dates";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";
import { memberCancel } from "../actions";

export const dynamic = "force-dynamic";

export default async function MemberHome({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const member = await requireMember();
  const { booked } = await searchParams;
  const now = new Date();

  const [upcoming, socials, tab, walkIn] = await Promise.all([
    db.booking.findMany({ where: { memberId: member.id, status: "booked", end: { gt: now } }, include: { court: true }, orderBy: { start: "asc" }, take: 6 }),
    db.socialPlayer.findMany({ where: { memberId: member.id, booking: { status: "booked", end: { gt: now } } }, include: { booking: { include: { court: true } } } }),
    db.tab.findFirst({ where: { memberId: member.id, status: "open" }, include: { items: { include: { menuItem: true } }, table: true } }),
    db.court.aggregate({ _min: { walkInRate: true } }),
  ]);

  const qr = await QRCode.toString(member.code, { type: "svg", margin: 0, color: { dark: "#123828", light: "#00000000" } });
  const { status, daysLeft } = membershipStatus(member.endDate, now);
  const statusText = status === "expired" ? "Membership expired" : status === "ending" ? (daysLeft === 0 ? "Ends today" : `Ends in ${daysLeft} days`) : `Valid till ${fmtDate(member.endDate)}`;

  return (
    <div className="space-y-6">
      {booked && (
        <p role="status" className="flex items-center gap-2 border border-[#c9dfa0] bg-[#eef6dc] px-4 py-3 text-[15px] text-[#3d5a12]">
          <CheckCircle2 className="size-5 shrink-0" /> Court booked. Pay at the front desk when you arrive.
        </p>
      )}

      <section aria-label="Membership card" className="relative overflow-hidden bg-forest p-5 text-cream shadow-[0_24px_50px_-24px_rgba(11,42,29,0.7)]">
        <div aria-hidden="true" className="absolute -right-10 -top-10 size-44 rounded-full border-[18px] border-ball/25" />
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-cream/70">{member.plan.name} member</p>
        <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight">{member.name}</h1>
        <div className="mt-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[15px] tracking-wider">{member.code}</p>
            <p className={`mt-1 text-[14px] ${status === "active" ? "text-cream/80" : "font-semibold text-[#ffb59a]"}`}>{statusText}</p>
          </div>
          <div className="size-[92px] bg-cream p-2" role="img" aria-label={`QR code for ${member.code}, show it at the front desk`}>
            <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
        </div>
        <p className="mt-4 text-[12.5px] text-cream/60">Show this code at the front desk to check in.</p>
      </section>

      {status === "expired" && (
        <p className="border border-clay/40 bg-clay-soft px-4 py-3 text-[14.5px] text-[#7c2f12]">Your membership has expired. Renew at the front desk to book courts and get your discounts again.</p>
      )}

      <section className="grid grid-cols-3 border border-line bg-paper text-center">
        <div className="px-2 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Court</p>
          <p className="mt-1 font-serif text-[20px] font-semibold text-forest">{member.plan.courtRate === 0 ? "Free" : inr(member.plan.courtRate)}</p>
          <p className="text-[11.5px] text-muted">walk-in {inr(walkIn._min.walkInRate ?? 0)}</p>
        </div>
        <div className="border-x border-line px-2 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Shop</p>
          <p className="mt-1 font-serif text-[20px] font-semibold text-forest">{member.plan.shopDiscount}% off</p>
        </div>
        <div className="px-2 py-3">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Café</p>
          <p className="mt-1 font-serif text-[20px] font-semibold text-forest">{member.plan.barDiscount ? `${member.plan.barDiscount}% off` : "—"}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/me/book" className="flex items-center justify-center gap-2 bg-forest px-4 py-3.5 text-[15.5px] font-semibold text-cream">
          <CalendarPlus className="size-[18px]" /> Book a court
        </Link>
        <Link href="/me/cafe" className="flex items-center justify-center gap-2 border border-forest px-4 py-3.5 text-[15.5px] font-semibold text-forest">
          <Coffee className="size-[18px]" /> Order food
        </Link>
      </div>

      <section>
        <h2 className="font-serif text-[22px] font-medium text-forest">Your courts</h2>
        {upcoming.length === 0 && socials.length === 0 ? (
          <p className="mt-2 text-[15px] text-muted">Nothing booked yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border border-line bg-paper">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-semibold">{b.court.name}</p>
                  <p className="text-[14px] text-muted">
                    {fmtDate(b.start)} · {fmtTime(b.start)} – {fmtTime(b.end)} · {b.price ? inr(b.price) : "Included"}
                  </p>
                </div>
                {b.start > now && (
                  <form action={memberCancel}>
                    <input type="hidden" name="bookingId" value={b.id} />
                    <button type="submit" className="px-2 py-1 text-[13.5px] font-semibold text-clay">
                      Cancel
                    </button>
                  </form>
                )}
              </li>
            ))}
            {socials.map((s) => (
              <li key={`s${s.id}`} className="px-4 py-3">
                <p className="font-semibold">Friday social · {s.booking.court.name}</p>
                <p className="text-[14px] text-muted">
                  {fmtDate(s.booking.start)} · {fmtTime(s.booking.start)} · {s.status === "waitlist" ? "On the waitlist" : s.status === "offered" ? "A place is waiting for you at the desk" : "You're playing"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tab && (
        <section>
          <h2 className="font-serif text-[22px] font-medium text-forest">Your café tab</h2>
          <div className="mt-3 border border-line bg-paper px-4 py-3">
            <p className="text-[14px] text-muted">
              {tab.table ? `Table ${tab.table.label} · ` : ""}
              {tab.items.reduce((n, i) => n + i.qty, 0)} items
            </p>
            <p className="mt-1 font-serif text-[24px] font-semibold text-forest">{inr(tab.total)}</p>
            {tab.discount > 0 && <p className="text-[13px] text-[#4d7a12]">includes {inr(tab.discount)} member discount</p>}
            <p className="mt-2 text-[13px] text-muted">Settle at the counter before you leave: cash, card or UPI.</p>
          </div>
        </section>
      )}
    </div>
  );
}
