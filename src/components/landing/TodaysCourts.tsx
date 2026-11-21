"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { CourtRow } from "@/lib/publicData";

const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

function range(iso: string) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + 60 * 60_000);
  return `${time(start).replace(/ (AM|PM)$/, "")}–${time(end)}`;
}

const statusStyle = {
  available: { dot: "bg-ball", label: "Available", text: "text-forest" },
  booked: { dot: "bg-[#b5aa98]", label: "Booked", text: "text-muted" },
  social: { dot: "bg-clay", label: "Social play", text: "text-clay" },
};

export function TodaysCourts({ rows, isToday }: { rows: CourtRow[]; isToday: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => {
      setNow(new Date());
      router.refresh();
    }, 60_000);
    return () => clearInterval(id);
  }, [router]);

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
        {rows.map((row, i) => {
          const s = statusStyle[row.status];
          const content = (
            <>
              <span className="text-[15px] font-medium text-ink">{row.court}</span>
              <span className="order-3 text-[14px] tabular-nums text-muted sm:order-none sm:text-[15px] sm:text-ink">{range(row.start)}</span>
              <span className={`row-span-2 flex items-center justify-end gap-2 text-[14px] font-medium sm:row-span-1 ${s.text}`}>
                <span className={`size-2.5 shrink-0 rounded-full ${s.dot}`} />
                <span className="whitespace-nowrap">
                  {s.label}
                  {row.note && <span className="hidden font-normal text-muted sm:inline"> · {row.note}</span>}
                </span>
                {row.href && <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />}
              </span>
            </>
          );
          const cls = "group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 py-3 sm:grid-cols-[minmax(0,1fr)_8.75rem_auto]";
          return (
            <motion.li
              key={row.courtId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {row.href ? (
                <Link href={row.href} className={cls} aria-label={`${row.court}, ${range(row.start)}, ${s.label}. ${row.status === "available" ? "Book a trial" : "Join"}`}>
                  {content}
                </Link>
              ) : (
                <div className={cls}>{content}</div>
              )}
            </motion.li>
          );
        })}
      </ul>

      <Link
        href="/courts"
        className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest underline decoration-forest/30 underline-offset-[5px] transition-colors hover:decoration-forest"
      >
        See all slots this week
        <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
