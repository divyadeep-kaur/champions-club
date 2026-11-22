import { CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES } from "./constants";
import { overlaps } from "./bookings";

// A blocked slot is stored as a Booking with this type, so every existing
// availability check (staff grid, member app, public pages) already treats it as taken.
export const BLOCKED = "blocked";

export type SlotBooking = {
  id: number;
  courtId: number;
  start: Date;
  end: Date;
  type: string;
  label: string;
};

export type SlotState =
  | { kind: "free" }
  | { kind: "past" }
  | { kind: "booked"; booking: SlotBooking }
  | { kind: "blocked"; booking: SlotBooking };

export type Slot = { start: Date; end: Date; state: SlotState };

// Every half hour the court is open on `day`, with what is happening in it.
export function daySlots(day: Date, courtId: number, bookings: SlotBooking[], now: Date): Slot[] {
  const slots: Slot[] = [];
  const close = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CLOSE_HOUR, 0);
  for (let t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), OPEN_HOUR, 0); t < close; t = new Date(t.getTime() + SLOT_MINUTES * 60_000)) {
    const span = { start: t, end: new Date(t.getTime() + SLOT_MINUTES * 60_000) };
    const hit = bookings.find((b) => b.courtId === courtId && overlaps(b, span));
    const state: SlotState = hit
      ? hit.type === BLOCKED
        ? { kind: "blocked", booking: hit }
        : { kind: "booked", booking: hit }
      : span.end <= now
        ? { kind: "past" }
        : { kind: "free" };
    slots.push({ ...span, state });
  }
  return slots;
}

export function slotSummary(slots: Slot[]) {
  const count = (k: SlotState["kind"]) => slots.filter((s) => s.state.kind === k).length;
  const booked = count("booked");
  const blocked = count("blocked");
  const free = count("free");
  return { free, booked, blocked, past: count("past"), total: slots.length, usedPct: Math.round((booked / Math.max(1, slots.length - blocked)) * 100) };
}
