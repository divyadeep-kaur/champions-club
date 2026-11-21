import { CLOSE_HOUR, MAX_BOOKINGS_PER_DAY, OPEN_HOUR, SESSION_MINUTES, SLOT_MINUTES } from "./constants";

type Span = { start: Date; end: Date };
type Existing = Span & { courtId: number; memberId: number | null };

export const sessionEnd = (start: Date) => new Date(start.getTime() + SESSION_MINUTES * 60_000);

export function slotStarts(day: Date) {
  const slots: Date[] = [];
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), OPEN_HOUR, 0);
  const lastStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CLOSE_HOUR, 0).getTime() - SESSION_MINUTES * 60_000;
  while (d.getTime() <= lastStart) {
    slots.push(new Date(d));
    d.setMinutes(d.getMinutes() + SLOT_MINUTES);
  }
  return slots;
}

export const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end;

export function bookingError(
  req: Span & { courtId: number; member: { id: number; endDate: Date; suspendedAt?: Date | null } | null; now: Date },
  ctx: { existing: Existing[]; memberBookingsThatDay: number },
) {
  const { start, end } = req;
  if (start.getMinutes() % SLOT_MINUTES !== 0 || start.getSeconds() !== 0) return "Sessions start on the hour or half hour";

  const open = new Date(start.getFullYear(), start.getMonth(), start.getDate(), OPEN_HOUR, 0);
  const close = new Date(start.getFullYear(), start.getMonth(), start.getDate(), CLOSE_HOUR, 0);
  if (start < open || end > close) return `Courts are open ${OPEN_HOUR} am to ${CLOSE_HOUR - 12} pm`;
  if (end <= req.now) return "That time has already passed";

  if (ctx.existing.some((b) => b.courtId === req.courtId && overlaps(b, req))) return "That court is already booked at this time";

  if (req.member) {
    const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    if (req.member.suspendedAt) return "This membership is suspended. Book them as a walk-in or reactivate it first";
    if (req.member.endDate < dayStart) return "This membership has expired. Renew it before booking";
    if (ctx.existing.some((b) => b.memberId === req.member!.id && overlaps(b, req))) return "This member is already on another court at that time";
    if (ctx.memberBookingsThatDay >= MAX_BOOKINGS_PER_DAY) return "Members can play at most twice a day";
  }
  return null;
}
