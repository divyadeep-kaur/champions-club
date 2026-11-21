import { describe, expect, it } from "vitest";
import { courtStatusAt, freeStarts, nextSlot } from "./availability";

const t = (hhmm: string) => new Date(`2026-11-21T${hhmm}:00`);
const day = new Date("2026-11-21T00:00:00");

describe("nextSlot", () => {
  it("rounds up to the next half hour", () => {
    expect(nextSlot(t("17:10"))).toEqual(t("17:30"));
    expect(nextSlot(t("17:30"))).toEqual(t("17:30"));
    expect(nextSlot(t("17:31"))).toEqual(t("18:00"));
  });
  it("jumps to 6 am before opening and to tomorrow after the last start", () => {
    expect(nextSlot(t("04:00"))).toEqual(t("06:00"));
    expect(nextSlot(t("22:10"))).toEqual(new Date("2026-11-22T06:00:00"));
  });
});

describe("freeStarts", () => {
  it("lists starts where a full hour is free and not in the past", () => {
    const bookings = [{ courtId: 1, start: t("18:00"), end: t("19:00") }];
    const free = freeStarts(day, 1, bookings, t("17:00")).map((d) => d.toTimeString().slice(0, 5));
    expect(free).toContain("17:00");
    expect(free).not.toContain("17:30");
    expect(free).not.toContain("18:30");
    expect(free).toContain("19:00");
    expect(free).not.toContain("16:30");
  });
});

describe("courtStatusAt", () => {
  it("reports free, booked with the next free time, or social places left", () => {
    const bookings = [
      { courtId: 1, start: t("18:00"), end: t("19:00"), type: "regular", capacity: 1, players: 0 },
      { courtId: 2, start: t("18:00"), end: t("19:00"), type: "social", capacity: 8, players: 5 },
    ];
    expect(courtStatusAt(3, t("18:00"), bookings)).toEqual({ status: "available" });
    expect(courtStatusAt(1, t("18:00"), bookings)).toEqual({ status: "booked", freeAt: t("19:00") });
    expect(courtStatusAt(2, t("18:00"), bookings)).toEqual({ status: "social", spotsLeft: 3 });
  });
});
