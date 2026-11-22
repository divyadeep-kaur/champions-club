import { describe, expect, it } from "vitest";
import { BLOCKED, daySlots, slotSummary } from "./courtSlots";

const day = new Date(2026, 10, 23);
const at = (h: number, m = 0) => new Date(2026, 10, 23, h, m);

describe("daySlots", () => {
  it("lists every half hour from opening to closing", () => {
    const slots = daySlots(day, 1, [], at(0));
    expect(slots).toHaveLength(34);
    expect(slots[0].start).toEqual(at(6));
    expect(slots.at(-1)!.end).toEqual(at(23));
    expect(slots.every((s) => s.state.kind === "free")).toBe(true);
  });

  it("marks booked, blocked and past slots, only for the right court", () => {
    const bookings = [
      { id: 1, courtId: 1, start: at(9), end: at(10), type: "regular", label: "Asha" },
      { id: 2, courtId: 1, start: at(12), end: at(12, 30), type: BLOCKED, label: "Resurfacing" },
      { id: 3, courtId: 2, start: at(14), end: at(15), type: "regular", label: "Other court" },
    ];
    const slots = daySlots(day, 1, bookings, at(7));
    const kind = (h: number, m = 0) => slots.find((s) => s.start.getTime() === at(h, m).getTime())!.state.kind;
    expect(kind(6)).toBe("past");
    expect(kind(7)).toBe("free");
    expect(kind(9)).toBe("booked");
    expect(kind(9, 30)).toBe("booked");
    expect(kind(10)).toBe("free");
    expect(kind(12)).toBe("blocked");
    expect(kind(14)).toBe("free");

    const sum = slotSummary(slots);
    expect(sum.booked).toBe(2);
    expect(sum.blocked).toBe(1);
    expect(sum.past).toBe(2);
    expect(sum.free).toBe(29);
  });
});
