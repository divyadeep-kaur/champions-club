import { db } from "@/lib/db";
import { isoDate } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { decideLeave } from "./actions";
import { LeaveForm } from "./LeaveForm";

export const dynamic = "force-dynamic";

const short = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const days = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
const tone: Record<string, string> = { pending: "bg-[#f6e7b8] text-[#5f4605]", approved: "bg-[#e3efc7] text-[#2f4a0a]", rejected: "bg-[#ece5d6] text-muted" };

export default async function LeavePage() {
  const staff = await requireStaff();
  const isOwner = staff.role === "owner";
  const requests = await db.leaveRequest.findMany({
    where: isOwner ? {} : { staffId: staff.id },
    include: { staff: true, decidedBy: true },
    orderBy: [{ status: "asc" }, { from: "desc" }],
    take: 30,
  });
  const pending = requests.filter((r) => r.status === "pending");
  const rest = requests.filter((r) => r.status !== "pending");

  return (
    <div className="grid content-start gap-5">
      <div>
        <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Leave</h1>
        <p className="mt-1.5 text-muted">
          {isOwner ? "Approve or turn down leave. Approved days show on the payroll page." : "Ask for days off. The owner approves them here."}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        <div className="grid min-w-0 flex-[999_1_520px] gap-4">
          <section className="border border-line bg-paper p-5">
            <h2 className="mb-2 text-[18px] font-semibold">{isOwner ? "Waiting for you" : "Waiting for approval"}</h2>
            {pending.length === 0 && <p className="text-muted">No pending requests.</p>}
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3 text-[14.5px]">
                <div>
                  <strong>{isOwner ? r.staff.name : "You"}</strong> · {short(r.from)}
                  {r.to.getTime() !== r.from.getTime() ? ` – ${short(r.to)}` : ""} ({days(r.from, r.to)} day{days(r.from, r.to) > 1 ? "s" : ""})
                  <div className="text-muted">{r.reason}</div>
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    {(["approved", "rejected"] as const).map((d) => (
                      <form key={d} action={decideLeave}>
                        <input type="hidden" name="leaveId" value={r.id} />
                        <input type="hidden" name="decision" value={d} />
                        <button
                          type="submit"
                          className={`min-h-10 px-3.5 text-[14px] font-semibold ${d === "approved" ? "bg-forest text-cream hover:bg-forest-deep" : "border-[1.5px] border-[#a8411f] text-[#a8411f]"}`}
                        >
                          {d === "approved" ? "Approve" : "Turn down"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
          <section className="border border-line bg-paper p-5">
            <h2 className="mb-2 text-[18px] font-semibold">History</h2>
            {rest.length === 0 && <p className="text-muted">Nothing yet.</p>}
            {rest.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ece5d6] py-2.5 text-[14.5px]">
                <span>
                  {isOwner && <strong>{r.staff.name} · </strong>}
                  {short(r.from)}
                  {r.to.getTime() !== r.from.getTime() ? ` – ${short(r.to)}` : ""} · {r.reason}
                </span>
                <span className={`px-2 py-0.5 text-[13px] font-semibold capitalize ${tone[r.status]}`}>
                  {r.status}
                  {r.decidedBy ? ` by ${r.decidedBy.name.split(" ")[0]}` : ""}
                </span>
              </div>
            ))}
          </section>
        </div>
        <div className="min-w-0 flex-[1_1_320px]">
          <LeaveForm today={isoDate(new Date())} />
        </div>
      </div>
    </div>
  );
}
