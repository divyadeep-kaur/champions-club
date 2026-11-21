import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, CalendarCheck, Check, CircleX, MessageSquare, Phone, ReceiptIndianRupee, Flag } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, fmtTime, hhmm, isoDate } from "@/lib/dates";
import { slotStarts } from "@/lib/bookings";
import { nextSlot } from "@/lib/availability";
import { requestDetails, STAGES, stageIndex, trialDecision } from "@/lib/leads";
import { requireStaff } from "@/lib/session";
import { LeadActions } from "../LeadActions";
import { LeadBadge } from "../LeadBadge";
import { TrialDecisionCard } from "./TrialDecisionCard";

export const dynamic = "force-dynamic";

const icons = {
  note: MessageSquare,
  status: Flag,
  trial: CalendarCheck,
  quote: ReceiptIndianRupee,
  joined: Check,
  approved: BadgeCheck,
  declined: CircleX,
} as const;
const dot = {
  note: "bg-[#8a6d3b]",
  status: "bg-clay",
  trial: "bg-[#4d7a12]",
  quote: "bg-[#2f6bff]",
  joined: "bg-forest",
  approved: "bg-forest",
  declined: "bg-clay",
} as const;

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireStaff(["owner", "desk"]);
  const { id } = await params;
  const lead = await db.lead.findUnique({
    where: { id: Number(id) || 0 },
    include: { activities: { orderBy: { createdAt: "asc" } }, booking: { include: { court: true } }, member: true },
  });
  if (!lead) notFound();

  const [courts, plans] = await Promise.all([
    db.court.findMany({ orderBy: [{ sport: "desc" }, { name: "asc" }] }),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" }, select: { name: true, monthlyFee: true } }),
  ]);

  const courtFromMessage = courts.find((c) => lead.message?.includes(c.name));
  const suggested = lead.preferredAt && lead.preferredAt > new Date() ? lead.preferredAt : nextSlot(new Date());
  const idx = stageIndex(lead.status);
  const decision = trialDecision(
    lead,
    lead.activities.map((a) => a.kind),
  );
  const asked = requestDetails(lead.message);
  const heldActive = lead.booking?.status === "booked";
  const request: [string, string][] = [
    ["Interested in", lead.interest === "trial" ? "Free trial" : lead.interest === "membership" ? "Membership" : "Other"],
    ["Mobile", lead.phone],
    ["Email", lead.email ?? "Not given"],
    ["Preferred day and time", lead.preferredAt ? `${fmtDate(lead.preferredAt)}, ${fmtTime(lead.preferredAt)}` : "Any time"],
    ["Court asked for", asked.court ?? "Any court"],
    ["Plan looked at", asked.plan ?? "Not picked"],
    ["Message", asked.note ?? "No message"],
    ["Request sent", `${fmtDate(lead.createdAt)}, ${fmtTime(lead.createdAt)}`],
  ];
  const timeline = [
    { id: 0, kind: "note" as const, text: `Enquiry from the website${lead.message ? `: “${lead.message}”` : ""}`, staffName: null, createdAt: lead.createdAt },
    ...lead.activities.map((a) => ({ ...a, kind: (a.kind in icons ? a.kind : "note") as keyof typeof icons })),
  ];

  return (
    <div className="space-y-6">
      <Link href="/staff/leads" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest">
        <ArrowLeft className="size-4" /> All leads
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <LeadBadge status={lead.status} />
            <span className="text-[14px] capitalize text-muted">Interested in {lead.interest}</span>
          </div>
          <h1 className="mt-2 font-serif text-[32px] font-semibold text-forest sm:text-[36px]">{lead.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
            <a href={`tel:+91${lead.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-forest underline underline-offset-4">
              <Phone className="size-4" /> {lead.phone}
            </a>
            {lead.email && <span className="text-muted">{lead.email}</span>}
            {lead.preferredAt && (
              <span className="text-muted">
                Wants {fmtDate(lead.preferredAt)}, {fmtTime(lead.preferredAt)}
              </span>
            )}
          </p>
        </div>
        {lead.quoteAmount != null && (
          <div className="text-right">
            <p className="text-[13px] text-muted">Quoted</p>
            <p className="font-serif text-[28px] font-semibold text-forest">
              {inr(lead.quoteAmount)} <span className="text-[15px] font-normal text-muted">{lead.plan}</span>
            </p>
          </div>
        )}
      </header>

      <ol aria-label="Pipeline" className="grid grid-cols-5 gap-1.5">
        {STAGES.map((s, i) => {
          const done = lead.status !== "lost" && i < idx;
          const current = lead.status !== "lost" && i === idx;
          return (
            <li
              key={s.key}
              aria-current={current ? "step" : undefined}
              className={`px-2.5 py-3 text-center text-[14px] font-bold ${current ? "bg-ball text-forest-deep" : done ? "bg-forest text-cream" : "bg-[#ece5d6] text-muted"}`}
            >
              {s.label}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          {decision === "pending" && <TrialDecisionCard leadId={lead.id} canApprove={heldActive} />}
          {decision === "approved" && (
            <p className="border border-[#c9dfa0] bg-[#eef6dc] px-4 py-3 text-[15px] font-semibold text-[#3d5a12]">Trial request approved.</p>
          )}
          {decision === "declined" && (
            <p className="border border-clay/30 bg-clay-soft px-4 py-3 text-[15px] font-semibold text-clay">Trial request declined.</p>
          )}

          <section className="border border-line bg-paper p-[22px]">
            <h2 className="text-[18px] font-semibold">What they filled in</h2>
            <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {request.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted">{k}</dt>
                  <dd className="mt-0.5 text-[15px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {lead.member && (
            <p className="border border-[#c9dfa0] bg-[#eef6dc] px-4 py-3 text-[15px] text-[#3d5a12]">
              Joined as{" "}
              <Link href={`/staff/members/${lead.member.id}`} className="font-semibold underline underline-offset-4">
                {lead.member.name} ({lead.member.code})
              </Link>
              .
            </p>
          )}
          {lead.booking && (
            <div className="border border-line bg-paper px-4 py-3 text-[15px]">
              <span className="font-semibold">Trial:</span> {lead.booking.court.name}, {fmtDate(lead.booking.start)} at {fmtTime(lead.booking.start)}
              {lead.booking.status === "cancelled" && <span className="text-clay"> (cancelled)</span>}{" "}
              <Link
                href={`/staff/bookings?date=${isoDate(lead.booking.start)}&booking=${lead.booking.id}`}
                className="font-semibold text-forest underline underline-offset-4"
              >
                Open in grid
              </Link>
            </div>
          )}

          <section className="border border-line bg-paper p-[22px]">
            <h2 className="text-[18px] font-semibold">Timeline</h2>
            <ol className="mt-3 grid">
              {timeline.map((a) => {
                const Icon = icons[a.kind];
                return (
                  <li key={`${a.kind}-${a.id}`} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 border-t border-[#ece5d6] py-3">
                    <span aria-hidden="true" className={`mt-0.5 grid size-[22px] place-items-center rounded-full text-cream ${dot[a.kind]}`}>
                      <Icon className="size-3" />
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{a.text}</p>
                      <p className="text-[13px] text-muted">
                        {fmtDate(a.createdAt)}, {fmtTime(a.createdAt)}
                        {a.staffName ? ` · ${a.staffName}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside>
          <LeadActions
            canConvert={session.role === "owner"}
            lead={{
              id: lead.id,
              status: lead.status,
              defaultDate: isoDate(suggested),
              defaultTime: hhmm(suggested),
              defaultCourtId: courtFromMessage?.id,
              plan: lead.plan,
            }}
            courts={courts.map((c) => ({ id: c.id, name: c.name }))}
            plans={plans}
            slots={slotStarts(new Date()).map(hhmm)}
          />
        </aside>
      </div>
    </div>
  );
}
