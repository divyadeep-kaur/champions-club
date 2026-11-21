import Link from "next/link";
import { CLOSE_HOUR, OPEN_HOUR, SLOT_MINUTES } from "@/lib/constants";
import { hhmm, isoDate } from "@/lib/dates";
import { overlaps, sessionEnd } from "@/lib/bookings";

type GridBooking = {
  id: number;
  courtId: number;
  start: Date;
  end: Date;
  type: string;
  capacity: number;
  label: string;
  plan?: string;
  players: number;
};

const ROWS = ((CLOSE_HOUR - OPEN_HOUR) * 60) / SLOT_MINUTES;
const rowOf = (d: Date) => ((d.getHours() - OPEN_HOUR) * 60 + d.getMinutes()) / SLOT_MINUTES + 2;

function tone(b: GridBooking) {
  if (b.type === "social") return "bg-[#e4f2bf] text-[#2f4a08] border-[#b9d97a]";
  if (b.type === "trial") return "bg-[#f6e7b8] text-[#5f4605] border-[#e3cd85]";
  if (b.plan) return "bg-forest text-cream border-forest";
  return "bg-clay-soft text-[#7c2f12] border-[#e9bfa9]";
}

export function BookingGrid({
  day,
  courts,
  bookings,
  now,
  selected,
  extraQuery = "",
}: {
  day: Date;
  courts: { id: number; name: string }[];
  bookings: GridBooking[];
  now: Date;
  selected: { bookingId?: number; courtId?: number; time?: string };
  extraQuery?: string;
}) {
  const date = isoDate(day);
  const rows = Array.from({ length: ROWS }, (_, i) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), OPEN_HOUR, i * SLOT_MINUTES));
  const nowRow = now.toDateString() === day.toDateString() && now.getHours() >= OPEN_HOUR && now.getHours() < CLOSE_HOUR ? rowOf(now) + (now.getMinutes() % SLOT_MINUTES) / SLOT_MINUTES : null;

  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <div
        className="relative grid min-w-[760px]"
        style={{ gridTemplateColumns: `64px repeat(${courts.length}, minmax(112px, 1fr))`, gridTemplateRows: `44px repeat(${ROWS}, 30px)` }}
      >
        <div className="sticky left-0 z-20 border-b border-line bg-paper" style={{ gridRow: 1, gridColumn: 1 }} />
        {courts.map((c, i) => (
          <div key={c.id} className="flex items-center border-b border-l border-line px-3 text-[13px] font-semibold text-ink" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {c.name}
          </div>
        ))}

        {rows.map((r, ri) => (
          <div
            key={ri}
            className={`sticky left-0 z-10 bg-paper pr-2 text-right text-[12px] tabular-nums text-muted ${r.getMinutes() === 0 ? "border-t border-line" : "border-t border-dashed border-line/60"}`}
            style={{ gridRow: ri + 2, gridColumn: 1 }}
          >
            {r.getMinutes() === 0 && <span className="relative -top-2 bg-paper px-1">{r.toLocaleTimeString("en-IN", { hour: "numeric", hour12: true })}</span>}
          </div>
        ))}

        {courts.map((c, ci) =>
          rows.map((r, ri) => {
            const span = { start: r, end: sessionEnd(r) };
            const lastStart = ri <= ROWS - 2;
            const past = span.end <= now;
            const free = lastStart && !past && !bookings.some((b) => b.courtId === c.id && overlaps(b, span));
            const isSelected = selected.courtId === c.id && selected.time === hhmm(r);
            const cls = `border-l border-t ${r.getMinutes() === 0 ? "border-line" : "border-dashed border-line/60"}`;
            const style = { gridRow: ri + 2, gridColumn: ci + 2 };
            if (!free) return <div key={`${c.id}-${ri}`} className={`${cls} ${past ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgba(85,99,92,0.06)_6px,rgba(85,99,92,0.06)_7px)]" : ""}`} style={style} />;
            return (
              <Link
                key={`${c.id}-${ri}`}
                href={`/staff/bookings?date=${date}&court=${c.id}&time=${hhmm(r)}${extraQuery}`}
                scroll={false}
                aria-label={`Book ${c.name} at ${r.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}
                className={`group ${cls} ${isSelected ? "bg-ball/40" : "hover:bg-ball/20"}`}
                style={style}
              >
                <span className={`block px-2 text-[12px] font-semibold leading-[29px] text-forest ${isSelected ? "" : "opacity-0 group-hover:opacity-100"}`}>
                  + {hhmm(r)}
                </span>
              </Link>
            );
          }),
        )}

        {bookings.map((b) => {
          const ci = courts.findIndex((c) => c.id === b.courtId);
          if (ci < 0) return null;
          const span = Math.round((b.end.getTime() - b.start.getTime()) / (SLOT_MINUTES * 60_000));
          return (
            <Link
              key={b.id}
              href={`/staff/bookings?date=${date}&booking=${b.id}`}
              scroll={false}
              className={`relative z-[5] m-[2px] overflow-hidden border px-2 py-1 text-[12.5px] leading-tight transition-shadow hover:shadow-md ${tone(b)} ${selected.bookingId === b.id ? "ring-2 ring-ink ring-offset-1" : ""}`}
              style={{ gridRow: `${rowOf(b.start)} / span ${span}`, gridColumn: ci + 2 }}
            >
              <span className="block truncate font-semibold">{b.label}</span>
              <span className="block truncate opacity-80">
                {b.type === "social" ? `Social · ${b.players}/${b.capacity}` : b.type === "trial" ? "Trial" : (b.plan ?? "Walk-in")}
              </span>
            </Link>
          );
        })}

        {nowRow !== null && (
          <div aria-hidden="true" className="pointer-events-none relative z-[6] border-t-2 border-clay" style={{ gridRow: Math.floor(nowRow), gridColumn: `2 / span ${courts.length}`, top: `${(nowRow % 1) * 30}px` }} />
        )}
      </div>
    </div>
  );
}
