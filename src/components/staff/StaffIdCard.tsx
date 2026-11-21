import Image from "next/image";
import { deptLabel } from "@/lib/payroll";

type Person = { name: string; code: string | null; jobTitle: string; department: string; phone: string | null; email: string; joinedAt: Date; active: boolean };

export function StaffIdCard({ staff }: { staff: Person }) {
  const initials = staff.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <section aria-label="Staff identity card" className="grid gap-4 bg-forest-deep p-5 text-cream">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-white p-0.5">
            <Image src="/brand/logo-mark.png" alt="" width={32} height={32} unoptimized />
          </span>
          <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-ball">Staff ID</span>
        </span>
        <span className="font-mono text-[18px] font-bold tracking-wider text-ball">{staff.code ?? "—"}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-ball font-serif text-[24px] text-forest-deep">{initials}</span>
        <div className="min-w-0">
          <p className="font-serif text-[24px] leading-tight">{staff.name}</p>
          <p className="text-[14.5px] text-cream/85">{staff.jobTitle || deptLabel(staff.department)}</p>
          <p className="text-[13px] text-cream/70">{deptLabel(staff.department)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-cream/20 pt-3 text-[13.5px]">
        <dt className="text-cream/65">Joined</dt>
        <dd className="text-right">{staff.joinedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
        <dt className="text-cream/65">Phone</dt>
        <dd className="text-right tabular-nums">{staff.phone ?? "—"}</dd>
        <dt className="text-cream/65">Email</dt>
        <dd className="truncate text-right">{staff.email}</dd>
        <dt className="text-cream/65">Status</dt>
        <dd className={`text-right font-semibold ${staff.active ? "text-ball" : "text-[#f0a58a]"}`}>{staff.active ? "Active" : "Inactive"}</dd>
      </dl>
    </section>
  );
}
