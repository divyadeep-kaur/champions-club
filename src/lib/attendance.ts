import { addDays, isoDate, startOfDay, startOfWeek } from "./dates";

export type CalendarDay = { date: string; count: number; future: boolean; today: boolean };

export function attendanceCalendar(played: Date[], today = new Date(), weeks = 16) {
  const counts = new Map<string, number>();
  for (const d of played) counts.set(isoDate(d), (counts.get(isoDate(d)) ?? 0) + 1);

  const first = addDays(startOfWeek(today), -(weeks - 1) * 7);
  const todayKey = isoDate(today);
  const columns: CalendarDay[][] = [];
  const months: { col: number; label: string }[] = [];

  for (let w = 0; w < weeks; w++) {
    const col: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(first, w * 7 + d);
      const key = isoDate(day);
      col.push({ date: key, count: counts.get(key) ?? 0, future: startOfDay(day) > startOfDay(today), today: key === todayKey });
      if (day.getDate() === 1 || (w === 0 && d === 0)) months.push({ col: w, label: day.toLocaleDateString("en-IN", { month: "short" }) });
    }
    columns.push(col);
  }

  const days = columns.flat().filter((d) => !d.future);
  const thisMonth = todayKey.slice(0, 7);
  const playedDays = days.filter((d) => d.count > 0);

  let weekStreak = 0;
  for (let w = columns.length - 1; w >= 0; w--) {
    const active = columns[w].some((d) => d.count > 0);
    if (active) weekStreak++;
    else if (w === columns.length - 1) continue;
    else break;
  }

  return {
    columns,
    months: months.filter((m, i) => i === 0 || m.col - months[i - 1].col >= 3),
    stats: {
      daysThisMonth: playedDays.filter((d) => d.date.startsWith(thisMonth)).length,
      sessions: days.reduce((s, d) => s + d.count, 0),
      daysPlayed: playedDays.length,
      weekStreak,
    },
  };
}
