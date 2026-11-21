"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { placeBooking } from "@/lib/bookingService";
import { inr } from "@/lib/constants";
import { canMove, stageLabel } from "@/lib/leads";
import { requireStaff } from "@/lib/session";

export type LeadState = { error?: string; ok?: string };

const refresh = (id: number) => {
  revalidatePath(`/staff/leads/${id}`);
  revalidatePath("/staff/leads");
  revalidatePath("/staff");
};

async function loadLead(formData: FormData) {
  const id = Number(formData.get("leadId"));
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) throw new Error("Lead not found");
  return lead;
}

export async function logContact(_: LeadState, formData: FormData): Promise<LeadState> {
  const staff = await requireStaff(["owner", "desk"]);
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 2) return { error: "Write what was said" };
  try {
    const lead = await loadLead(formData);
    const moving = lead.status === "new" || lead.status === "lost";
    await db.$transaction([
      db.leadActivity.create({ data: { leadId: lead.id, kind: "note", text, staffName: staff.name } }),
      ...(moving && canMove(lead.status, "contacted")
        ? [db.lead.update({ where: { id: lead.id }, data: { status: "contacted" } }), db.leadActivity.create({ data: { leadId: lead.id, kind: "status", text: lead.status === "lost" ? "Reopened" : "Moved to Contacted", staffName: staff.name } })]
        : []),
    ]);
    refresh(lead.id);
    return { ok: "Saved" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save" };
  }
}

const trialSchema = z.object({
  courtId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
});

export async function bookTrial(_: LeadState, formData: FormData): Promise<LeadState> {
  const staff = await requireStaff(["owner", "desk"]);
  const parsed = trialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const lead = await loadLead(formData);
    if (lead.status === "won") return { error: "This lead has already joined" };
    const start = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
    await db.$transaction(async (tx) => {
      if (lead.bookingId) await tx.booking.updateMany({ where: { id: lead.bookingId, status: "booked" }, data: { status: "cancelled" } });
      const { booking, court } = await placeBooking(tx, { courtId: parsed.data.courtId, start, member: null, guestName: `Trial: ${lead.name}`, guestPhone: lead.phone, type: "trial", method: "later" });
      await tx.lead.update({ where: { id: lead.id }, data: { bookingId: booking.id, ...(canMove(lead.status, "trial") ? { status: "trial" } : {}) } });
      const when = start.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
      await tx.leadActivity.create({ data: { leadId: lead.id, kind: "trial", text: `${lead.bookingId ? "Moved trial to" : "Trial booked:"} ${court.name}, ${when}`, staffName: staff.name } });
    });
    refresh(lead.id);
    revalidatePath("/staff/bookings");
    return { ok: "Trial booked and added to the court grid" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not book the trial" };
  }
}

const quoteSchema = z.object({ plan: z.string().min(1, "Pick a plan"), amount: z.coerce.number().int().min(0).max(1_000_000) });

export async function sendQuote(_: LeadState, formData: FormData): Promise<LeadState> {
  const staff = await requireStaff(["owner", "desk"]);
  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const lead = await loadLead(formData);
    if (lead.status !== "quoted" && !canMove(lead.status, "quoted")) return { error: `Can't quote a lead that is ${stageLabel(lead.status).toLowerCase()}` };
    await db.$transaction([
      db.lead.update({ where: { id: lead.id }, data: { status: "quoted", plan: parsed.data.plan, quoteAmount: parsed.data.amount } }),
      db.leadActivity.create({ data: { leadId: lead.id, kind: "quote", text: `Quoted ${parsed.data.plan} membership at ${inr(parsed.data.amount)}`, staffName: staff.name } }),
    ]);
    refresh(lead.id);
    return { ok: "Quote recorded" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save the quote" };
  }
}

export async function markLost(_: LeadState, formData: FormData): Promise<LeadState> {
  const staff = await requireStaff(["owner", "desk"]);
  const reason = String(formData.get("reason") ?? "").trim();
  if (reason.length < 2) return { error: "Say why, so the next person knows" };
  try {
    const lead = await loadLead(formData);
    if (!canMove(lead.status, "lost")) return { error: "This lead can't be marked lost" };
    await db.$transaction([
      db.lead.update({ where: { id: lead.id }, data: { status: "lost" } }),
      db.leadActivity.create({ data: { leadId: lead.id, kind: "status", text: `Marked lost: ${reason}`, staffName: staff.name } }),
    ]);
    refresh(lead.id);
    return { ok: "Marked lost" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not update" };
  }
}
