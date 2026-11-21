import Link from "next/link";
import { SLOT_MINUTES } from "@/lib/constants";
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

export const WINDOWS = {
  morning: { label: "Morning", from: 6, to: 12 },
  afternoon: { label: "Afternoon", from: 12, to: 17 },
  evening: { label: "Evening", from: 17, to: 23 },
} as const;
export type GridWindow = keyof typeof WINDOWS;

export function defaultWindow(now: Date, day: Date): GridWindow {
  if (now.toDateString() !== day.toDateString()) return "evening";
  const h = now.getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}

function tone(b: GridBooking) {
  if (b.type === "social") return "bg-clay";
  if (b.type === "trial") return "bg-[#4d7a12]";
  if (b.plan) return "bg-forest";
  return "bg-[#8a6d3b]";
}

const label = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/ ?(am|pm)$/i, "");

export function BookingGrid({
  day,
  courts,
  bookings,
  now,
  selected,
  window: win,
  extraQuery = "",
}: {
  day: Date;
  courts: { id: number; name: string }[];
  bookings: GridBooking[];
  now: Date;
  selected: { bookingId?: number; courtId?: number; time?: string };
  window: GridWindow;
  extraQuery?: string;
}) {
  const date = isoDate(day);
  const { from, to } = WINDOWS[win];
  const cols = ((to - from) * 60) / SLOT_MINUTES;
  const times = Array.from({ length: cols }, (_, i) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), from, i * SLOT_MINUTES));
  const winStart = times[0];
  const winEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), to, 0);
  const colOf = (d: Date) => Math.round((d.getTime() - winStart.getTime()) / (SLOT_MINUTES * 60_000)) + 2;
  const closing = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 0);

  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <div className="grid min-w-[820px] text-[13.5px]" style={{ gridTemplateColumns: `150px repeat(${cols}, minmax(0, 1fr))` }}>
        <div className="border-b border-line p-2.5" style={{ gridRow: 1, gridColumn: 1 }} />
        {times.map((t, i) => (
          <div key={i} className="border-b border-l border-line border-l-[#ece5d6] px-1 py-2.5 text-muted" style={{ gridRow: 1, gridColumn: i + 2 }}>
            {t.getMinutes() === 0 ? label(t) : ""}
          </div>
        ))}

        {courts.map((c, ri) => (
          <div key={c.id} className="border-b border-[#ece5d6] px-2.5 py-3.5 font-semibold" style={{ gridRow: ri + 2, gridColumn: 1 }}>
            {c.name}
          </div>
        ))}

        {courts.map((c, ri) =>
          times.map((t, ci) => {
            const span = { start: t, end: sessionEnd(t) };
            const free = span.end <= closing && span.end > now && !bookings.some((b) => b.courtId === c.id && overlaps(b, span));
            const style = { gridRow: ri + 2, gridColumn: ci + 2 };
            const base = "min-h-[54px] border-b border-l border-[#ece5d6]";
            if (!free) return <div key={`${c.id}-${ci}`} className={`${base} ${span.end <= now ? "bg-[#f1ece2]" : ""}`} style={style} />;
            const on = selected.courtId === c.id && selected.time === hhmm(t);
            return (
              <Link
                key={`${c.id}-${ci}`}
                href={`/staff/bookings?date=${date}&w=${win}&court=${c.id}&time=${hhmm(t)}${extraQuery}`}
                scroll={false}
                aria-label={`Book ${c.name} at ${t.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}
                className={`group ${base} ${on ? "bg-ball/50" : "hover:bg-ball/25"}`}
                style={style}
              >
                <span className={`block pt-4 text-center text-[12px] font-bold text-forest ${on ? "" : "opacity-0 group-hover:opacity-100"}`}>+</span>
              </Link>
            );
          }),
        )}

        {bookings.map((b) => {
          const ri = courts.findIndex((c) => c.id === b.courtId);
          if (ri < 0 || b.end <= winStart || b.start >= winEnd) return null;
          const s = b.start < winStart ? winStart : b.start;
          const e = b.end > winEnd ? winEnd : b.end;
          const startCol = colOf(s);
          const span = Math.max(1, colOf(e) - startCol);
          return (
            <Link
              key={b.id}
              href={`/staff/bookings?date=${date}&w=${win}&booking=${b.id}`}
              scroll={false}
              className={`relative z-[2] mx-[3px] my-1.5 overflow-hidden px-2 py-1.5 text-[12.5px] leading-[1.3] text-paper hover:brightness-110 ${tone(b)} ${selected.bookingId === b.id ? "ring-2 ring-ink ring-offset-1" : ""}`}
              style={{ gridRow: ri + 2, gridColumn: `${startCol} / span ${span}` }}
            >
              <strong className="block truncate">{b.label}</strong>
              <span className="block truncate opacity-90">
                {b.type === "social" ? `${b.players} of ${b.capacity} places` : b.type === "trial" ? "Trial" : (b.plan ?? "Walk-in")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
