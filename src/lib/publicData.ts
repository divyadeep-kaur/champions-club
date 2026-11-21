import { db } from "./db";
import { courtStatusAt, freeStarts, nextSlot } from "./availability";
import { hhmm, isoDate } from "./dates";

export type CourtRow = {
  courtId: number;
  court: string;
  start: string;
  status: "available" | "booked" | "social";
  note?: string;
  href?: string;
};

export const courtLabel = (name: string) => name.replace(/^Tennis Court /, "Tennis ");

const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

export async function landingCourts(now = new Date()) {
  const at = nextSlot(now);
  const dayStart = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const [courts, bookings] = await Promise.all([
    db.court.findMany({ orderBy: [{ sport: "desc" }, { name: "asc" }], take: 4 }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: dayStart, lt: new Date(dayStart.getTime() + 86_400_000) } },
      include: { _count: { select: { players: { where: { status: "confirmed" } } } } },
    }),
  ]);
  const info = bookings.map((b) => ({ courtId: b.courtId, start: b.start, end: b.end, type: b.type, capacity: b.capacity, players: b._count.players }));

  const rows: CourtRow[] = courts.map((c) => {
    const s = courtStatusAt(c.id, at, info);
    const trial = `/trial?${new URLSearchParams({ date: isoDate(at), time: hhmm(at), court: String(c.id) })}`;
    if (s.status === "available") return { courtId: c.id, court: courtLabel(c.name), start: at.toISOString(), status: "available", href: trial };
    if (s.status === "social")
      return { courtId: c.id, court: courtLabel(c.name), start: at.toISOString(), status: "social", note: `${s.spotsLeft} spots left`, href: "/me/login" };
    return { courtId: c.id, court: courtLabel(c.name), start: at.toISOString(), status: "booked", note: s.freeAt ? `free at ${time(s.freeAt)}` : "full today" };
  });

  return { rows, isToday: at.toDateString() === now.toDateString() };
}

const short = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/ ?(am|pm)$/i, "");

export async function weekGlance(sport: "tennis" | "cricket", now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Array.from({ length: 5 }, (_, i) => new Date(today.getTime() + i * 86_400_000));
  const end = new Date(today.getTime() + 5 * 86_400_000);
  const [courts, bookings] = await Promise.all([
    db.court.findMany({ where: { sport } }),
    db.booking.findMany({
      where: { status: "booked", start: { gte: today, lt: end }, court: { sport } },
      select: { courtId: true, start: true, end: true, type: true },
    }),
  ]);
  return days.map((d) => {
    const starts = new Map<number, Date>();
    for (const c of courts) for (const s of freeStarts(d, c.id, bookings, now)) starts.set(s.getTime(), s);
    const sorted = [...starts.values()].sort((a, b) => a.getTime() - b.getTime());
    const pick = (from: number, to: number) => {
      const list = sorted.filter((s) => s.getHours() >= from && s.getHours() < to).slice(0, 2);
      return list.length ? list.map(short).join(", ") : "Full";
    };
    const social = bookings.some((b) => b.type === "social" && b.start.toDateString() === d.toDateString());
    return {
      day: d.toLocaleDateString("en-IN", { weekday: "short" }),
      am: pick(0, 12),
      pm: pick(12, 17),
      eve: social ? "Social play" : pick(17, 24),
    };
  });
}
