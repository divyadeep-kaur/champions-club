import Link from "next/link";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { startOfMonth } from "@/lib/dates";
import { requestDetails, STAGES, trialDecision } from "@/lib/leads";
import { requireStaff } from "@/lib/session";
import { btnPrimary } from "@/components/staff/ui";
import { AutoRefresh } from "../kitchen/AutoRefresh";
import { TrialRequests, type TrialRequest } from "./TrialRequests";

export const dynamic = "force-dynamic";

const columnColor: Record<string, string> = { new: "#c4572f", contacted: "#8a6d3b", trial: "#4d7a12", quoted: "#2f6bff", won: "#123828" };
const action: Record<string, string> = { new: "Call back", contacted: "Book a trial", trial: "Send a quote", quoted: "Convert to member", won: "View member" };
const short = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const long = (d: Date) => d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const ago = (d: Date) => {
  const m = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return short(d);
};

export default async function LeadsPage() {
  await requireStaff(["owner", "desk"]);
  const monthStart = startOfMonth();
  const [leads, lost, joinedThisMonth] = await Promise.all([
    db.lead.findMany({
      where: { OR: [{ status: { notIn: ["won", "lost"] } }, { status: "won", createdAt: { gte: monthStart } }] },
      include: { activities: { orderBy: { createdAt: "desc" } }, booking: { include: { court: true } }, member: true },
      orderBy: { createdAt: "desc" },
    }),
    db.lead.findMany({
      where: { status: "lost" },
      include: { activities: { where: { kind: "status" }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.lead.count({ where: { status: "won", createdAt: { gte: monthStart } } }),
  ]);

  const open = leads.filter((l) => l.status !== "won");
  const waiting = new Set(
    leads
      .filter(
        (l) =>
          trialDecision(
            l,
            l.activities.map((a) => a.kind),
          ) === "pending",
      )
      .map((l) => l.id),
  );
  const requests: TrialRequest[] = leads
    .filter((l) => waiting.has(l.id))
    .map((l) => {
      const d = requestDetails(l.message);
      const held = l.booking && l.booking.status === "booked" ? `${l.booking.court.name}, ${long(l.booking.start)}` : null;
      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        interest: l.interest,
        wants: l.preferredAt ? long(l.preferredAt) : null,
        court: d.court ?? null,
        held,
        plan: d.plan ?? l.plan,
        note: d.note ?? null,
        received: long(l.createdAt),
        ago: ago(l.createdAt),
      };
    });
  const quotesOut = leads.filter((l) => l.status === "quoted").reduce((s, l) => s + (l.quoteAmount ?? 0), 0);

  const meta = (l: (typeof leads)[number]) => {
    if (l.status === "won" && l.member) return `Joined as ${l.member.code}`;
    if (l.status === "quoted" && l.quoteAmount != null) return `Quoted ${l.plan ?? ""} ${inr(l.quoteAmount)}`.replace("  ", " ");
    if (l.status === "trial" && l.booking) return `Trial ${short(l.booking.start)}, ${time(l.booking.start)} · ${l.booking.court.name}`;
    if (l.preferredAt) return `Wants ${short(l.preferredAt)}, ${time(l.preferredAt)} · received ${short(l.createdAt)}`;
    return `Received ${short(l.createdAt)}`;
  };

  return (
    <div className="grid content-start gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[32px] font-semibold text-forest sm:text-[36px]">Leads</h1>
          <p className="mt-1.5 text-muted">
            Free trial requests from the website wait here for approval. Open any lead for its timeline, trial booking and quote.
          </p>
        </div>
        <Link href="/trial" target="_blank" className={btnPrimary}>
          Add walk-in enquiry
        </Link>
      </div>

      <AutoRefresh seconds={8} />
      <TrialRequests requests={requests} />

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1180px] grid-cols-5 items-start gap-4">
          {STAGES.map((stage) => {
            const cards = leads.filter((l) => l.status === stage.key);
            return (
              <section key={stage.key} className="grid gap-3 bg-[#ece5d6] p-3.5" aria-label={`${stage.label} leads`}>
                <h2 className="flex justify-between text-[15px] font-semibold">
                  <span>{stage.key === "won" ? "Joined this month" : stage.label}</span>
                  <span className="text-muted">{cards.length}</span>
                </h2>
                {cards.length === 0 && <p className="text-[13.5px] text-muted">None right now.</p>}
                {cards.map((c) => (
                  <article
                    key={c.id}
                    className="grid gap-2 border border-line border-t-[3px] bg-paper p-3.5"
                    style={{ borderTopColor: columnColor[stage.key] }}
                  >
                    <div className="flex justify-between gap-2">
                      <strong className="leading-tight">{c.name}</strong>
                      <span className="h-fit bg-cream px-2 py-0.5 text-[12.5px] font-bold capitalize">{c.interest}</span>
                    </div>
                    <div className="line-clamp-2 text-[14px] leading-[1.45] text-[#3c4a43]">{c.activities[0]?.text ?? c.message ?? "No message"}</div>
                    <div className="text-[13px] text-muted">{meta(c)}</div>
                    {waiting.has(c.id) && <span className="w-fit bg-[#f6e3c4] px-2 py-0.5 text-[12px] font-bold text-[#7a4b0c]">Waiting for approval</span>}
                    <Link
                      href={
                        c.status === "won" && c.member
                          ? `/staff/members/${c.member.id}`
                          : c.status === "quoted"
                            ? `/staff/members/new?lead=${c.id}`
                            : `/staff/leads/${c.id}`
                      }
                      className="block border-[1.5px] border-forest p-2.5 text-[14px] font-semibold text-forest hover:bg-forest/5"
                    >
                      {action[stage.key]} →
                    </Link>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </div>

      {lost.length > 0 && (
        <p className="text-[14.5px] text-muted">
          <strong className="text-[#a8411f]">Lost ({lost.length}):</strong>{" "}
          {lost.map((l, i) => (
            <span key={l.id}>
              {i > 0 && " · "}
              {l.name}
              {l.activities[0] ? `, “${l.activities[0].text.replace(/^Marked lost: /, "")}”` : ""}{" "}
              <Link href={`/staff/leads/${l.id}`} className="text-forest underline underline-offset-4">
                Reopen
              </Link>
            </span>
          ))}
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {[
          ["Open enquiries", String(open.length)],
          ["Quotes out", inr(quotesOut)],
          ["Became members this month", String(joinedThisMonth)],
        ].map(([l, v]) => (
          <div key={l} className="border border-line bg-paper p-[18px]">
            <div className="text-[14px] text-muted">{l}</div>
            <div className="font-serif text-[28px] text-forest">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
