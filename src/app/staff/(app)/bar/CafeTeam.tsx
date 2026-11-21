import { db } from "@/lib/db";
import { fmtTime } from "@/lib/dates";

// The café and bar team with who is working right now: an open shift means on shift,
// approved leave covering today means away.
export async function CafeTeam() {
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const team = await db.staff.findMany({
    where: { role: "bar", active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      jobTitle: true,
      shifts: { where: { end: null }, orderBy: { start: "desc" }, take: 1, select: { start: true } },
      leaves: { where: { status: "approved", from: { lte: now }, to: { gte: dayStart } }, take: 1, select: { to: true } },
    },
  });
  if (team.length === 0) return null;
  const onShift = team.filter((s) => s.shifts.length).length;

  return (
    <section aria-label="Café team" className="border border-line bg-paper">
      <h2 className="flex items-baseline justify-between border-b border-line px-4 py-3 text-[16px] font-semibold">
        Café team
        <span className="text-[13.5px] font-normal text-muted">
          {onShift} of {team.length} on shift
        </span>
      </h2>
      <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
        {team.map((s) => {
          const shift = s.shifts[0];
          const leave = s.leaves[0];
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 bg-paper px-4 py-3">
              <span className="min-w-0">
                <strong className="block truncate">{s.name}</strong>
                <span className="block truncate text-[13px] text-muted">{s.jobTitle || "Café & bar"}</span>
              </span>
              <span
                className={`shrink-0 px-2 py-1 text-[12.5px] font-semibold ${
                  shift ? "bg-[#e3efc7] text-[#2f4a0a]" : leave ? "bg-[#f6e7b8] text-[#5f4605]" : "bg-[#ece5d6] text-muted"
                }`}
              >
                {shift ? `On shift since ${fmtTime(shift.start)}` : leave ? "On leave" : "Off shift"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
