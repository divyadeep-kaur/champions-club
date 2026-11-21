"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";

type Status = "available" | "booked" | "social";

type Slot = { court: string; start: Date; status: Status; note?: string };

const OPEN_HOUR = 6;
const CLOSE_HOUR = 23;

const courts: { court: string; offset: number; status: Status }[] = [
  { court: "Tennis · Court 1", offset: 0, status: "available" },
  { court: "Tennis · Court 2", offset: 30, status: "booked" },
  { court: "Cricket · Net 1", offset: 30, status: "available" },
  { court: "Tennis · Court 3", offset: 60, status: "booked" },
];

function firstSlot(now: Date) {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  if (d.getHours() < OPEN_HOUR) d.setHours(OPEN_HOUR, 0);
  if (d.getHours() >= CLOSE_HOUR - 1) {
    d.setDate(d.getDate() + 1);
    d.setHours(OPEN_HOUR, 0);
  }
  return d;
}

function buildSlots(now: Date): Slot[] {
  const base = firstSlot(now);
  const fridayNight = base.getDay() === 5 && base.getHours() >= 18;
  return courts.map(({ court, offset, status }, i) => {
    const start = new Date(base.getTime() + offset * 60_000);
    if (fridayNight && i === 3) return { court, start, status: "social", note: "3 spots left" };
    return { court, start, status };
  });
}

const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

function range(start: Date) {
  const end = new Date(start.getTime() + 60 * 60_000);
  return `${time(start).replace(/ (AM|PM)$/, "")}–${time(end)}`;
}

const statusStyle: Record<Status, { dot: string; label: string; text: string }> = {
  available: { dot: "bg-ball", label: "Available", text: "text-forest" },
  booked: { dot: "bg-[#b5aa98]", label: "Booked", text: "text-muted" },
  social: { dot: "bg-clay", label: "Social play", text: "text-clay" },
};

export function TodaysCourts() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const slots = now ? buildSlots(now) : null;
  const isToday = slots ? slots[0].start.toDateString() === now!.toDateString() : true;

  return (
    <div className="bg-paper p-5 shadow-[0_30px_60px_-28px_rgba(11,42,29,0.55)] sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-serif text-[26px] font-medium leading-none tracking-[-0.015em] text-forest sm:text-[30px]">
          {isToday ? "Today’s courts" : "Tomorrow’s courts"}
        </h2>
        <span className="flex items-center gap-2 pb-0.5 text-[12.5px] font-medium text-muted">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-ball opacity-70 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-ball" />
          </span>
          {now ? `Live · ${time(now)}` : "Live"}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {(slots ?? courts.map((c) => ({ ...c, start: null as Date | null, note: undefined }))).map((slot, i) => {
          const s = statusStyle[slot.status];
          const bookable = slot.status !== "booked";
          return (
            <motion.li
              key={slot.court}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <a
                href={bookable ? "#" : undefined}
                aria-disabled={!bookable}
                className={`group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[minmax(0,1fr)_8.75rem_8.5rem] ${bookable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="text-[15px] font-medium text-ink">{slot.court}</span>
                <span className="order-3 col-span-1 text-[14px] tabular-nums text-muted sm:order-none sm:text-[15px] sm:text-ink">
                  {slot.start ? range(slot.start) : "—"}
                </span>
                <span className={`row-span-2 flex items-center justify-end gap-2 text-[14px] font-medium sm:row-span-1 ${s.text}`}>
                  <span className={`size-2.5 rounded-full ${s.dot}`} />
                  <span className="whitespace-nowrap">
                    {s.label}
                    {slot.note && <span className="hidden font-normal text-muted sm:inline"> · {slot.note}</span>}
                  </span>
                  {bookable && (
                    <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  )}
                </span>
              </a>
            </motion.li>
          );
        })}
      </ul>

      <a
        href="#"
        className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest underline decoration-forest/30 underline-offset-[5px] transition-colors hover:decoration-forest"
      >
        See all slots this week
        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </a>
    </div>
  );
}
