import { attendanceCalendar } from "@/lib/attendance";

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function cellClass(count: number, future: boolean) {
  if (future) return "border border-dashed border-line/70 bg-transparent";
  if (count === 0) return "border border-line bg-cream";
  if (count === 1) return "bg-[#8fc93a]";
  return "bg-[#3d7a12]";
}

const label = (date: string, count: number) => {
  const d = new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return count === 0 ? `${d}: no session` : `${d}: played ${count} session${count > 1 ? "s" : ""}`;
};

export function AttendanceCalendar({ played, now }: { played: Date[]; now: Date }) {
  const { columns, months, stats } = attendanceCalendar(played, now, 16);
  const monthName = now.toLocaleDateString("en-IN", { month: "long" });

  return (
    <section aria-labelledby="attendance-title" className="grid gap-3 rounded-2xl border border-line bg-paper p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="attendance-title" className="text-[20px] font-bold text-forest">
          Your game days
        </h2>
        <span className="text-[13px] text-muted">last 16 weeks</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[10px] bg-cream px-1 py-2">
          <p className="text-[20px] font-extrabold leading-none text-forest">{stats.daysThisMonth}</p>
          <p className="mt-1 text-[12px] text-muted">days in {monthName}</p>
        </div>
        <div className="rounded-[10px] bg-cream px-1 py-2">
          <p className="text-[20px] font-extrabold leading-none text-forest">{stats.weekStreak}</p>
          <p className="mt-1 text-[12px] text-muted">{stats.weekStreak === 1 ? "week" : "weeks"} in a row</p>
        </div>
        <div className="rounded-[10px] bg-cream px-1 py-2">
          <p className="text-[20px] font-extrabold leading-none text-forest">{stats.sessions}</p>
          <p className="mt-1 text-[12px] text-muted">sessions played</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          role="img"
          aria-label={`Attendance calendar: you played on ${stats.daysPlayed} days in the last 16 weeks, ${stats.daysThisMonth} of them in ${monthName}.`}
          className="inline-grid grid-cols-[auto_1fr] gap-x-1.5"
        >
          <span />
          <div className="relative mb-1 h-4 text-[11px] text-muted" aria-hidden="true">
            {months.map((m) => (
              <span key={`${m.col}-${m.label}`} className="absolute" style={{ left: `${m.col * 17}px` }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 gap-[3px] text-[10px] leading-[14px] text-muted" aria-hidden="true">
            {DAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="flex gap-[3px]" aria-hidden="true">
            {columns.map((col, w) => (
              <div key={w} className="grid grid-rows-7 gap-[3px]">
                {col.map((day) => (
                  <span
                    key={day.date}
                    title={day.future ? undefined : label(day.date, day.count)}
                    style={{ animationDelay: `${w * 30}ms` }}
                    className={`cc-cal-cell block size-[14px] rounded-[3px] ${cellClass(day.count, day.future)} ${day.today ? "ring-2 ring-forest ring-offset-1 ring-offset-paper" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] border border-line bg-cream" /> No session
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-[#8fc93a]" /> Played
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-[#3d7a12]" /> Played twice
        </span>
      </div>
    </section>
  );
}
