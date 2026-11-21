import { describe, expect, it } from "vitest";
import { bookingError, overlaps, sessionEnd, slotStarts } from "./bookings";

const t = (hhmm: string, day = "2026-11-21") => new Date(`${day}T${hhmm}:00`);
const now = t("08:00");
const member = { id: 7, endDate: new Date("2026-12-31T00:00:00") };

describe("slotStarts", () => {
  it("opens a slot every 30 minutes from 6 am, last one-hour session at 10 pm", () => {
    const slots = slotStarts(new Date("2026-11-21T00:00:00"));
    expect(slots[0]).toEqual(t("06:00"));
    expect(slots[1]).toEqual(t("06:30"));
    expect(slots.at(-1)).toEqual(t("22:00"));
    expect(slots).toHaveLength(33);
  });
});

describe("overlaps", () => {
  it("detects overlapping one-hour sessions that start half an hour apart", () => {
    expect(overlaps({ start: t("18:00"), end: t("19:00") }, { start: t("18:30"), end: t("19:30") })).toBe(true);
  });
  it("lets back-to-back sessions share the boundary", () => {
    expect(overlaps({ start: t("18:00"), end: t("19:00") }, { start: t("19:00"), end: t("20:00") })).toBe(false);
  });
});

describe("bookingError", () => {
  const base = { courtId: 1, start: t("18:00"), end: sessionEnd(t("18:00")), now };

  it("accepts a free court", () => {
    expect(bookingError({ ...base, member }, { existing: [], memberBookingsThatDay: 0 })).toBeNull();
  });

  it("never puts two bookings on the same court at the same time", () => {
    const existing = [{ courtId: 1, memberId: 3, start: t("17:30"), end: t("18:30") }];
    expect(bookingError({ ...base, member: null }, { existing, memberBookingsThatDay: 0 })).toMatch(/already booked/);
  });

  it("ignores bookings on other courts", () => {
    const existing = [{ courtId: 2, memberId: 3, start: t("18:00"), end: t("19:00") }];
    expect(bookingError({ ...base, member: null }, { existing, memberBookingsThatDay: 0 })).toBeNull();
  });

  it("stops a member being on two courts at once", () => {
    const existing = [{ courtId: 2, memberId: 7, start: t("18:30"), end: t("19:30") }];
    expect(bookingError({ ...base, member }, { existing, memberBookingsThatDay: 1 })).toMatch(/another court/);
  });

  it("allows at most two bookings per member per day", () => {
    expect(bookingError({ ...base, member }, { existing: [], memberBookingsThatDay: 2 })).toMatch(/twice/);
  });

  it("refuses an expired membership", () => {
    const expired = { id: 7, endDate: new Date("2026-11-20T00:00:00") };
    expect(bookingError({ ...base, member: expired }, { existing: [], memberBookingsThatDay: 0 })).toMatch(/expired/);
  });

  it("only allows half-hour starts inside opening hours", () => {
    expect(bookingError({ ...base, start: t("18:15"), end: t("19:15"), member: null }, { existing: [], memberBookingsThatDay: 0 })).toMatch(/half hour/);
    expect(bookingError({ ...base, start: t("22:30"), end: t("23:30"), member: null }, { existing: [], memberBookingsThatDay: 0 })).toMatch(/open/);
    expect(bookingError({ ...base, start: t("05:30"), end: t("06:30"), member: null }, { existing: [], memberBookingsThatDay: 0 })).toMatch(/open/);
  });

  it("refuses times that have already passed", () => {
    expect(bookingError({ ...base, start: t("07:00"), end: t("08:00"), member: null }, { existing: [], memberBookingsThatDay: 0 })).toMatch(/passed/);
  });
});
