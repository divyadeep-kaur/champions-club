import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";
import { memberCancel, memberLogout } from "../actions";
import { addDays, startOfDay } from "@/lib/dates";
import { AttendanceCalendar } from "./AttendanceCalendar";

export const dynamic = "force-dynamic";

const when = (d: Date) => {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const day = d.toDateString() === today.toDateString() ? "Today" : d.toDateString() === tomorrow.toDateString() ? "Tomorrow" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })}`;
};

export default async function MemberHome({ searchParams }: { searchParams: Promise<{ booked?: string }> }) {
  const member = await requireMember();
  const { booked } = await searchParams;
  const now = new Date();

  const [upcoming, socials, tab, orders] = await Promise.all([
    db.booking.findMany({ where: { memberId: member.id, status: "booked", end: { gt: now } }, include: { court: true }, orderBy: { start: "asc" }, take: 6 }),
    db.socialPlayer.findMany({ where: { memberId: member.id, booking: { status: "booked", end: { gt: now } } }, include: { booking: { include: { court: true } } } }),
    db.tab.findFirst({ where: { memberId: member.id, status: "open" }, include: { items: true, table: true } }),
    db.order.findMany({ where: { memberId: member.id, channel: "online", status: { in: ["pending", "ready"] } }, include: { items: { include: { product: true } } }, orderBy: { createdAt: "desc" } }),
  ]);

  const since = addDays(startOfDay(now), -16 * 7);
  const [playedCourts, playedSocials] = await Promise.all([
    db.booking.findMany({ where: { memberId: member.id, status: "booked", start: { gte: since, lte: now } }, select: { start: true } }),
    db.socialPlayer.findMany({ where: { memberId: member.id, status: "confirmed", booking: { status: "booked", start: { gte: since, lte: now } } }, select: { booking: { select: { start: true } } } }),
  ]);
  const played = [...playedCourts.map((b) => b.start), ...playedSocials.map((p) => p.booking.start)];

  const st = membershipStatus(member.endDate, now);
  const badge = st.status === "expired" ? { t: "Expired", c: "bg-clay-soft text-[#7a2f14]" } : st.status === "ending" ? { t: "Ending soon", c: "bg-[#f6e7b8] text-[#5f4605]" } : { t: "Active", c: "bg-ball/90 text-forest-deep" };

  return (
    <main className="grid content-start gap-[18px] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[15px] text-muted">Hi {member.name.split(" ")[0]}</span>
        <form action={memberLogout}>
          <button type="submit" className="py-2.5 text-[14px] font-semibold text-forest">
            Sign out
          </button>
        </form>
      </div>

      <section aria-label="Membership card" className="relative flex min-h-[200px] flex-col justify-between gap-5 overflow-hidden rounded-[22px] p-5 text-white">
        <Image src="/images/shop-rackets.jpg" alt="" aria-hidden="true" fill unoptimized sizes="560px" className="object-cover object-[50%_45%]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(11,42,29,0.85),rgba(11,42,29,0.35))]" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="text-[13px] uppercase tracking-[0.12em] opacity-85">{member.plan.name} member</div>
            <div className="mt-1 text-[26px] font-extrabold leading-tight">{member.name}</div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[13px] font-extrabold ${badge.c}`}>{badge.t}</span>
        </div>
        <div className="relative grid grid-cols-3 gap-2 rounded-[14px] border border-white/30 bg-white/[0.16] p-3 text-[13px] backdrop-blur-md">
          <div>
            <div className="opacity-80">Code</div>
            <strong className="text-[15px] tracking-wide">{member.code}</strong>
          </div>
          <div>
            <div className="opacity-80">{st.status === "expired" ? "Ended" : "Ends"}</div>
            <strong className="text-[15px]">{member.endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong>
          </div>
          <div>
            <div className="opacity-80">Days left</div>
            <strong className="text-[15px]">{Math.max(0, st.daysLeft)}</strong>
          </div>
        </div>
      </section>

      {st.status === "expired" && <p className="rounded-xl bg-clay-soft p-3 text-[14px] text-[#7a2f14]">Your membership has expired. Renew at the front desk to book courts and get your discounts again.</p>}

      <div className="grid grid-cols-3 gap-2 text-center text-[13px]">
        {[
          [member.plan.courtRate === 0 ? "Free" : inr(member.plan.courtRate), "court / hr"],
          [`${member.plan.shopDiscount}%`, "off shop"],
          [`${member.plan.barDiscount}%`, "off café"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-[14px] border border-line bg-paper p-2.5">
            <strong className="block text-[16px] text-forest">{v}</strong>
            {l}
          </div>
        ))}
      </div>

      {booked && (
        <p role="status" className="rounded-xl bg-[#e3efc7] p-3 text-[14px] text-[#2f4a0a]">
          Booked! Pay at the front desk when you arrive.
        </p>
      )}

      <AttendanceCalendar played={played} now={now} />

      <section className="grid gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[20px] font-bold text-forest">Your courts</h2>
          <Link href="/me/book" className="py-2 text-[14px] font-bold text-forest">
            Book
          </Link>
        </div>
        {upcoming.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2.5 rounded-2xl border border-line bg-paper p-3.5">
            <div>
              <strong>{b.court.name}</strong>
              <div className="text-[14px] text-muted">
                {when(b.start)} · {b.price ? inr(b.price) : "included"}
              </div>
            </div>
            {b.start > now && (
              <form action={memberCancel}>
                <input type="hidden" name="bookingId" value={b.id} />
                <button type="submit" className="min-h-11 rounded-full border-[1.5px] border-[#a8411f] px-3.5 py-2 text-[14px] font-bold text-[#a8411f]">
                  Cancel
                </button>
              </form>
            )}
          </div>
        ))}
        {socials.map((s) => (
          <div key={`s${s.id}`} className="rounded-2xl border border-line bg-paper p-3.5">
            <strong>Friday social · {s.booking.court.name}</strong>
            <div className="text-[14px] text-muted">
              {when(s.booking.start)} · {s.status === "waitlist" ? "on the waitlist" : s.status === "offered" ? "a place is waiting for you at the desk" : "you’re playing"}
            </div>
          </div>
        ))}
        {upcoming.length === 0 && socials.length === 0 && <p className="text-[14.5px] text-muted">No courts booked. You can book up to 7 days ahead.</p>}
      </section>

      {orders.length > 0 && (
        <section className="grid gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[20px] font-bold text-forest">Your shop orders</h2>
            <Link href="/me/shop" className="py-2 text-[14px] font-bold text-forest">
              Shop
            </Link>
          </div>
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2.5 rounded-2xl border border-line bg-paper p-3.5">
              <div className="min-w-0">
                <strong>#{o.id}</strong> <span className="text-muted">· {o.items.map((i) => i.product.name).join(", ")}</span>
                <div className="text-[14px] text-muted">
                  {o.fulfilment === "delivery" ? "Delivery" : "Collect at the desk"} · {inr(o.total)}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12.5px] font-bold ${o.status === "ready" ? "bg-ball text-forest-deep" : "bg-[#f6e7b8] text-[#5f4605]"}`}>
                {o.status === "ready" ? (o.fulfilment === "pickup" ? "Ready to collect" : "Out for delivery") : "Being packed"}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="grid gap-2.5">
        <h2 className="text-[20px] font-bold text-forest">Your café tab</h2>
        {tab ? (
          <div className="grid gap-1.5 rounded-2xl border border-line bg-paper p-3.5 text-[14.5px]">
            <div className="flex justify-between">
              <span>
                {tab.table ? `${tab.table.label} · ` : ""}
                {tab.items.reduce((n, i) => n + i.qty, 0)} items
              </span>
              <strong className="tabular-nums">{inr(tab.total)}</strong>
            </div>
            {tab.discount > 0 && (
              <div className="text-[#4d7a12]">
                {member.plan.name} discount saved you {inr(tab.discount)}
              </div>
            )}
            <div className="text-muted">Pay at the bar by cash, card or UPI</div>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-paper p-3.5 text-[14.5px] text-muted">
            No open tab.{" "}
            <Link href="/me/cafe" className="font-semibold text-forest underline underline-offset-4">
              Order from your table
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
