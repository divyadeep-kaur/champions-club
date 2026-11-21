import { CLOSE_HOUR, OPEN_HOUR, SESSION_MINUTES, SLOT_MINUTES } from "./constants";
import { overlaps, sessionEnd, slotStarts } from "./bookings";

type Span = { courtId: number; start: Date; end: Date };
type BookingInfo = Span & { type: string; capacity: number; players: number };

export function nextSlot(now: Date) {
  const d = new Date(now);
  d.setSeconds(0, 0);
  if (d < now) d.setMinutes(d.getMinutes() + 1);
  d.setMinutes(Math.ceil(d.getMinutes() / SLOT_MINUTES) * SLOT_MINUTES);
  const lastStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), CLOSE_HOUR, 0).getTime() - SESSION_MINUTES * 60_000;
  if (d.getHours() < OPEN_HOUR) d.setHours(OPEN_HOUR, 0, 0, 0);
  else if (d.getTime() > lastStart) {
    d.setDate(d.getDate() + 1);
    d.setHours(OPEN_HOUR, 0, 0, 0);
  }
  return d;
}

export function freeStarts(day: Date, courtId: number, bookings: Span[], now: Date) {
  return slotStarts(day).filter((s) => s >= now && !bookings.some((b) => b.courtId === courtId && overlaps(b, { start: s, end: sessionEnd(s) })));
}

export function courtStatusAt(courtId: number, at: Date, bookings: BookingInfo[]) {
  const span = { start: at, end: sessionEnd(at) };
  const clash = bookings.filter((b) => b.courtId === courtId && overlaps(b, span));
  if (clash.length === 0) return { status: "available" as const };
  const social = clash.find((b) => b.type === "social" && b.start.getTime() === at.getTime());
  if (social && clash.length === 1 && social.players < social.capacity) return { status: "social" as const, spotsLeft: social.capacity - social.players };
  const day = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const freeAt = freeStarts(day, courtId, bookings, at)[0];
  return { status: "booked" as const, ...(freeAt ? { freeAt } : {}) };
}
