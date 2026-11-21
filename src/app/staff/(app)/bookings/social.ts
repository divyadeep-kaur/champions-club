"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { answerOffer as answer, joinSession, leaveSession } from "@/lib/socialService";
import { requireStaff } from "@/lib/session";

export type RosterState = { error?: string; ok?: string };

const refresh = () => {
  revalidatePath("/staff/bookings");
  revalidatePath("/me");
  revalidatePath("/me/book");
};

const joinSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  player: z.string().trim().min(2, "Enter a member code or the guest's name"),
  method: z.enum(["cash", "card", "upi"]).default("upi"),
});

export async function joinSocial(_: RosterState, formData: FormData): Promise<RosterState> {
  await requireStaff(["owner", "desk"]);
  const parsed = joinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { bookingId, player, method } = parsed.data;

  try {
    const r = await db.$transaction(async (tx) => {
      const code = player.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
      const member = code ? await tx.member.findUnique({ where: { code }, include: { plan: true } }) : null;
      if (code && !member) throw new Error(`No member with code ${code}`);
      return joinSession(tx, bookingId, { member, guestName: player }, method);
    });
    refresh();
    return { ok: r.status === "confirmed" ? `${r.name} is in (${r.position} of ${r.capacity})` : `Court is full, ${r.name} is on the waitlist` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not add the player" };
  }
}

export async function leaveSocial(formData: FormData) {
  await requireStaff(["owner", "desk"]);
  await db.$transaction((tx) => leaveSession(tx, Number(formData.get("playerId"))));
  refresh();
}

export async function answerOffer(formData: FormData) {
  await requireStaff(["owner", "desk"]);
  await db.$transaction((tx) => answer(tx, Number(formData.get("playerId")), formData.get("answer") === "accept", "upi"));
  refresh();
}
