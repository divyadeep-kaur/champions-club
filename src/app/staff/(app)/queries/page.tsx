import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { deptLabel, MONEY_TOPICS, topicLabel } from "@/lib/payroll";
import { requireStaff } from "@/lib/session";
import { Badge, fieldCls } from "@/components/staff/ui";
import { answerQuery } from "./actions";
import { QueryForm } from "./QueryForm";

export const dynamic = "force-dynamic";

const when = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const statusTone = { open: "gold", answered: "green", approved: "green", declined: "clay" } as const;
const statusText: Record<string, string> = { open: "Waiting", answered: "Answered", approved: "Approved", declined: "Declined" };
const FILTERS = [
  { key: "open", label: "Waiting" },
  { key: "done", label: "Answered" },
  { key: "all", label: "All" },
];

export default async function QueriesPage({ searchParams }: { searchParams: Promise<{ show?: string; topic?: string }> }) {
  const session = await requireStaff();
  const isOwner = session.role === "owner";
  const sp = await searchParams;
  const show = FILTERS.some((f) => f.key === sp.show) ? sp.show! : "open";

  const where = isOwner
    ? { ...(show === "open" ? { status: "open" } : show === "done" ? { status: { not: "open" } } : {}), ...(sp.topic ? { topic: sp.topic } : {}) }
    : { staffId: session.id };
  const [queries, me, counts] = await Promise.all([
    db.staffQuery.findMany({ where, include: { staff: true, repliedBy: true }, orderBy: [{ createdAt: "desc" }], take: 60 }),
    db.staff.findUnique({ where: { id: session.id } }),
    isOwner ? db.staffQuery.groupBy({ by: ["status"], _count: true }) : Promise.resolve([]),
  ]);
  const count = (k: string) =>
    k === "all" ? counts.reduce((s, c) => s + c._count, 0) : counts.filter((c) => (k === "open" ? c.status === "open" : c.status !== "open")).reduce((s, c) => s + c._count, 0);
  const moneyAsked = queries.filter((q) => q.status === "open" && q.amount).reduce((s, q) => s + (q.amount ?? 0), 0);

  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Staff queries</h1>
          <p className="mt-1.5 text-muted">
            {isOwner
              ? "Questions, advances and expense claims from the team. Approving money adds it to Bills so it shows in the books."
              : "Ask about your salary, an advance, an expense claim or your shifts."}
          </p>
        </div>
        {isOwner && moneyAsked > 0 && show === "open" && (
          <p className="border border-line bg-paper px-4 py-2 text-[14.5px]">
            Money waiting for approval <strong className="tabular-nums">{inr(moneyAsked)}</strong>
          </p>
        )}
      </div>

      {isOwner && (
        <nav aria-label="Filter queries" className="flex w-fit flex-wrap border-[1.5px] border-forest">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/staff/queries?show=${f.key}`}
              aria-current={show === f.key ? "page" : undefined}
              className={`flex min-h-11 items-center gap-2 px-4 font-semibold ${show === f.key ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
            >
              {f.label} <span className="text-[13px] tabular-nums opacity-80">{count(f.key)}</span>
            </Link>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div className="grid min-w-0 flex-[999_1_560px] gap-3">
          {queries.length === 0 && <p className="border border-line bg-paper p-5 text-muted">{isOwner ? "No queries here." : "You haven’t asked anything yet."}</p>}
          {queries.map((q) => (
            <article key={q.id} className="grid gap-2.5 border border-line bg-paper p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {isOwner && (
                    <p className="text-[13.5px] text-muted">
                      <Link href={`/staff/team/${q.staffId}`} className="font-semibold text-forest hover:underline">
                        {q.staff.name}
                      </Link>{" "}
                      · {q.staff.code} · {q.staff.jobTitle || deptLabel(q.staff.department)}
                    </p>
                  )}
                  <h2 className="text-[16.5px] font-semibold">{q.subject}</h2>
                  <p className="text-[13px] text-muted">
                    {topicLabel(q.topic)} · {when(q.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {q.amount ? <strong className="tabular-nums">{inr(q.amount)}</strong> : null}
                  <Badge tone={statusTone[q.status as keyof typeof statusTone] ?? "gray"}>{statusText[q.status] ?? q.status}</Badge>
                </div>
              </div>
              <p className="text-[14.5px] whitespace-pre-line">{q.message}</p>
              {q.reply && (
                <div className="border-l-[3px] border-forest bg-cream px-3 py-2 text-[14.5px]">
                  <p className="text-[12.5px] font-semibold text-muted">
                    {q.repliedBy?.name ?? "Owner"}
                    {q.repliedAt ? ` · ${when(q.repliedAt)}` : ""}
                  </p>
                  {q.reply}
                  {q.topic === "advance" && q.status === "approved" && (
                    <p className="mt-1 text-[13px] text-muted">{q.recoveredMonth ? `Taken off the ${q.recoveredMonth} salary.` : "Comes off the next payroll."}</p>
                  )}
                </div>
              )}
              {isOwner && q.status === "open" && (
                <form action={answerQuery} className="grid gap-2">
                  <input type="hidden" name="queryId" value={q.id} />
                  <label className="sr-only" htmlFor={`reply-${q.id}`}>
                    Reply to {q.staff.name}
                  </label>
                  <textarea id={`reply-${q.id}`} name="reply" rows={2} placeholder="Write a reply" className={fieldCls} />
                  <div className="flex flex-wrap gap-2">
                    {MONEY_TOPICS.includes(q.topic) && q.amount ? (
                      <button name="decision" value="approve" className="min-h-10 bg-forest px-3.5 text-[14px] font-semibold text-cream hover:bg-forest-deep">
                        Approve {inr(q.amount)}
                      </button>
                    ) : null}
                    <button name="decision" value="reply" className="min-h-10 border-[1.5px] border-forest px-3.5 text-[14px] font-semibold text-forest hover:bg-forest/5">
                      Send reply
                    </button>
                    <button name="decision" value="decline" className="min-h-10 border-[1.5px] border-[#a8411f] px-3.5 text-[14px] font-semibold text-[#a8411f]">
                      Decline
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
        {!isOwner && (
          <div className="min-w-0 flex-[1_1_320px]">
            <QueryForm maxAdvance={Math.floor((me?.monthlySalary ?? 0) / 2)} />
          </div>
        )}
      </div>
    </div>
  );
}
