import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Check, MessageSquare, Phone, ReceiptIndianRupee, Flag } from "lucide-react";
import { db } from "@/lib/db";
import { inr } from "@/lib/constants";
import { fmtDate, fmtTime, hhmm, isoDate } from "@/lib/dates";
import { slotStarts } from "@/lib/bookings";
import { nextSlot } from "@/lib/availability";
import { STAGES, stageIndex } from "@/lib/leads";
import { requireStaff } from "@/lib/session";
import { LeadActions } from "../LeadActions";
import { LeadBadge } from "../LeadBadge";

export const dynamic = "force-dynamic";

const icons = { note: MessageSquare, status: Flag, trial: CalendarCheck, quote: ReceiptIndianRupee, joined: Check } as const;

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(["owner", "desk"]);
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
  const timeline = [
    { id: 0, kind: "note" as const, text: `Enquiry from the website${lead.message ? `: “${lead.message}”` : ""}`, staffName: null, createdAt: lead.createdAt },
    ...lead.activities.map((a) => ({ ...a, kind: (a.kind in icons ? a.kind : "note") as keyof typeof icons })),
  ];

  return (
    <div className="space-y-6">
      <Link href="/staff/leads" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-forest">
        <ArrowLeft className="size-4" /> All leads
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <LeadBadge status={lead.status} />
            <span className="text-[14px] capitalize text-muted">Interested in {lead.interest}</span>
          </div>
          <h1 className="mt-2 font-serif text-[40px] font-semibold leading-none tracking-[-0.02em] text-forest">{lead.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
            <a href={`tel:+91${lead.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-forest underline underline-offset-4">
              <Phone className="size-4" /> {lead.phone}
            </a>
            {lead.email && <span className="text-muted">{lead.email}</span>}
            {lead.preferredAt && <span className="text-muted">Wants {fmtDate(lead.preferredAt)}, {fmtTime(lead.preferredAt)}</span>}
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

      <ol aria-label="Pipeline" className="grid grid-cols-5 gap-1">
        {STAGES.map((s, i) => {
          const done = lead.status !== "lost" && i <= idx;
          return (
            <li key={s.key} className="text-center">
              <div className={`h-1.5 ${done ? "bg-forest" : "bg-line"}`} />
              <p className={`mt-1.5 text-[12.5px] font-semibold ${done ? "text-forest" : "text-muted"}`}>{s.label}</p>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
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
              <Link href={`/staff/bookings?date=${isoDate(lead.booking.start)}&booking=${lead.booking.id}`} className="font-semibold text-forest underline underline-offset-4">
                Open in grid
              </Link>
            </div>
          )}

          <section>
            <h2 className="font-serif text-[22px] font-medium text-forest">Timeline</h2>
            <ol className="mt-3 space-y-0 border-l-2 border-line pl-5">
              {timeline.map((a) => {
                const Icon = icons[a.kind];
                return (
                  <li key={`${a.kind}-${a.id}`} className="relative pb-5">
                    <span className="absolute -left-[31px] top-0 grid size-6 place-items-center rounded-full border-2 border-cream bg-forest text-cream">
                      <Icon className="size-3" />
                    </span>
                    <p className="text-[15px] text-ink">{a.text}</p>
                    <p className="text-[13px] text-muted">
                      {fmtDate(a.createdAt)}, {fmtTime(a.createdAt)}
                      {a.staffName ? ` · ${a.staffName}` : ""}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <aside>
          <LeadActions
            lead={{ id: lead.id, status: lead.status, defaultDate: isoDate(suggested), defaultTime: hhmm(suggested), defaultCourtId: courtFromMessage?.id, plan: lead.plan }}
            courts={courts.map((c) => ({ id: c.id, name: c.name }))}
            plans={plans}
            slots={slotStarts(new Date()).map(hhmm)}
          />
        </aside>
      </div>
    </div>
  );
}
