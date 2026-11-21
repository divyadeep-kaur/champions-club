import { describe, expect, it } from "vitest";
import { attendanceCalendar } from "./attendance";

const today = new Date(2026, 10, 21, 15, 0);
const d = (day: number, month = 10, h = 18) => new Date(2026, month, day, h, 0);

describe("attendance calendar", () => {
  it("lays out whole weeks from Monday, ending with this week", () => {
    const cal = attendanceCalendar([], today, 4);
    expect(cal.columns).toHaveLength(4);
    expect(cal.columns[0][0].date).toBe("2026-10-26");
    expect(cal.columns[3][5]).toMatchObject({ date: "2026-11-21", today: true, future: false });
    expect(cal.columns[3][6]).toMatchObject({ date: "2026-11-22", future: true });
  });

  it("marks played days and counts two sessions on one day once", () => {
    const cal = attendanceCalendar([d(21, 10, 7), d(21), d(18), d(28, 9)], today, 4);
    const all = cal.columns.flat();
    expect(all.find((x) => x.date === "2026-11-21")!.count).toBe(2);
    expect(cal.stats).toMatchObject({ daysThisMonth: 2, daysPlayed: 3, sessions: 4 });
  });

  it("counts a weekly streak and lets the current week be empty so far", () => {
    expect(attendanceCalendar([d(18), d(11), d(4)], today, 6).stats.weekStreak).toBe(3);
    expect(attendanceCalendar([d(11), d(4)], today, 6).stats.weekStreak).toBe(2);
    expect(attendanceCalendar([d(11), d(28, 9)], today, 6).stats.weekStreak).toBe(1);
  });
});
