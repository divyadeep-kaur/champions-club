"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/members";
import { placeBooking } from "@/lib/bookingService";
import { DECISION_KINDS, trialDecision, type TrialDecision } from "@/lib/leads";

export type TrialState = {
  error?: string;
  done?: { name: string; when?: string; court?: string; id?: number; phone?: string; trial?: boolean };
  fields?: Record<string, string>;
};

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: z.string().trim().min(1, "Enter your mobile number"),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  interest: z.enum(["trial", "membership", "other"]),
  date: z.string().optional(),
  time: z.string().optional(),
  courtId: z.string().optional(),
  plan: z.string().optional(),
  message: z.string().trim().max(500).optional(),
  website: z.string().max(0).optional(),
});

export async function submitTrial(_: TrialState, formData: FormData): Promise<TrialState> {
  const fields = Object.fromEntries(formData) as Record<string, string>;
  if (fields.website) return { done: { name: "there" } };
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const f = parsed.data;

  const phone = normalizePhone(f.phone);
  if (!phone) return { error: "Enter a 10-digit Indian mobile number", fields };

  let preferredAt: Date | null = null;
  if (f.date && f.time && /^\d{4}-\d{2}-\d{2}$/.test(f.date) && /^\d{2}:\d{2}$/.test(f.time)) {
    preferredAt = new Date(`${f.date}T${f.time}:00`);
    if (preferredAt < new Date()) return { error: "Pick a time later than now", fields };
  }

  const court = f.courtId ? await db.court.findUnique({ where: { id: Number(f.courtId) || 0 } }) : null;
  const details = [court && `Court: ${court.name}`, f.plan && `Plan: ${f.plan}`, f.message].filter(Boolean).join(" · ");

  const when = preferredAt?.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

  const { leadId, heldCourt } = await db.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: { name: f.name, phone, email: f.email || null, interest: f.interest, preferredAt, message: details || null, plan: f.plan || null, status: "new" },
    });
    await tx.leadActivity.create({ data: { leadId: lead.id, kind: "note", text: `Enquiry from the website${when ? ` for ${when}` : ""}` } });
    const start = f.interest === "trial" ? preferredAt : null;
    if (!start) return { leadId: lead.id, heldCourt: null };

    // Hold a court straight away so nobody else takes the slot while the desk decides.
    const courts = await tx.court.findMany({ orderBy: [{ sport: "desc" }, { name: "asc" }] });
    const order = court ? [court, ...courts.filter((c) => c.id !== court.id)] : courts;
    for (const c of order) {
      try {
        const { booking } = await placeBooking(tx, {
          courtId: c.id,
          start,
          member: null,
          guestName: `Trial: ${f.name}`,
          guestPhone: phone,
          type: "trial",
          method: "later",
        });
        await tx.lead.update({ where: { id: lead.id }, data: { status: "trial", bookingId: booking.id } });
        await tx.leadActivity.create({ data: { leadId: lead.id, kind: "trial", text: `Court held for the trial request: ${c.name}, ${when}` } });
        return { leadId: lead.id, heldCourt: c.name };
      } catch {
        continue;
      }
    }
    await tx.leadActivity.create({ data: { leadId: lead.id, kind: "note", text: "No court was free at the requested time. Call to offer another slot." } });
    return { leadId: lead.id, heldCourt: null };
  });

  revalidatePath("/staff/leads");
  revalidatePath("/staff/bookings");
  revalidatePath("/staff");
  revalidatePath("/courts");

  return {
    done: {
      name: f.name.split(" ")[0],
      when: preferredAt
        ? preferredAt.toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
        : undefined,
      court: heldCourt ?? undefined,
      id: leadId,
      phone,
      trial: f.interest === "trial",
    },
  };
}

export type TrialStatus = { decision: TrialDecision | null; court?: string; when?: string };

// The thank-you screen asks this every few seconds, so the guest sees the
// club's answer as soon as the desk approves or declines. The phone number
// has to match, so nobody can look up someone else's request by id.
export async function trialStatus(id: number, phone: string): Promise<TrialStatus> {
  const lead = await db.lead.findUnique({
    where: { id: Number(id) || 0 },
    include: { activities: { where: { kind: { in: DECISION_KINDS } }, select: { kind: true } }, booking: { include: { court: true } } },
  });
  if (!lead || lead.phone !== phone) return { decision: null };
  const decision = trialDecision(
    lead,
    lead.activities.map((a) => a.kind),
  );
  const booked = lead.booking && lead.booking.status === "booked" ? lead.booking : null;
  return {
    decision,
    court: booked?.court.name,
    when: booked?.start.toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }),
  };
}
