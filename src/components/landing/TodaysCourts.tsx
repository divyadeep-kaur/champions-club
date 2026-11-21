"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CourtRow } from "@/lib/publicData";

const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

const status = {
  available: { label: "Available", color: "text-[#4d7a12]" },
  booked: { label: "Booked", color: "text-[#6b6357]" },
  social: { label: "Social play", color: "text-clay" },
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
    <div className="rounded-2xl border border-white/60 bg-paper/80 p-[22px] text-left shadow-[0_24px_60px_rgba(11,42,29,0.25)] backdrop-blur-xl">
      <div className="flex items-baseline justify-between">
        <span className="text-[18px] font-extrabold text-forest">{isToday ? "Today’s courts" : "Tomorrow’s courts"}</span>
        <span className="text-[13px] text-muted">{now ? `Live · ${time(now)}` : "Live"}</span>
      </div>
      {rows.map((r) => {
        const s = status[r.status];
        const inner = (
          <>
            <span>
              {r.court} · {time(new Date(r.start))}
            </span>
            <span className={`font-bold ${s.color}`} title={r.note}>
              {s.label}
            </span>
          </>
        );
        const cls = "flex justify-between gap-3 border-t border-line py-2.5 text-[14.5px] text-ink";
        return r.href ? (
          <Link key={r.courtId} href={r.href} className={`${cls} hover:text-forest`} aria-label={`${r.court}, ${s.label}${r.note ? `, ${r.note}` : ""}`}>
            {inner}
          </Link>
        ) : (
          <div key={r.courtId} className={cls}>
            {inner}
          </div>
        );
      })}
      <Link href="/courts" className="mt-1 inline-block text-[14px] font-bold text-forest">
        See all slots this week →
      </Link>
    </div>
  );
}
