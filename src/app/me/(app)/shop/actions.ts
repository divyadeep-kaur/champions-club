"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cartTotals, stockError } from "@/lib/checkout";
import { inr } from "@/lib/constants";
import { benefitPlan } from "@/lib/membership";
import { requireMember } from "@/lib/memberSession";
import { normalizePhone } from "@/lib/members";
import { CLUB_SPOTS, INDIAN_STATES, formatAddress, isPincode, shippingFor } from "@/lib/delivery";
import { getShippingRule } from "@/lib/deliveryService";

export type ShopState = { error?: string; ok?: string; at?: number };

const schema = z.object({
  items: z.string(),
  fulfilment: z.enum(["club", "delivery"], { message: "Choose how you want your order" }),
  clubSpot: z.string().trim().max(60).optional(),
  line1: z.string().trim().max(120).optional(),
  line2: z.string().trim().max(120).optional(),
  landmark: z.string().trim().max(80).optional(),
  city: z.string().trim().max(60).optional(),
  state: z.string().trim().max(60).optional(),
  pincode: z.string().trim().max(10).optional(),
  phone: z.string().trim().max(20).optional(),
});

// Checks the delivery details and returns what to store on the order.
async function deliveryDetails(f: z.infer<typeof schema>, memberPhone: string) {
  if (f.fulfilment === "club") {
    const courts = await db.court.findMany({ select: { name: true } });
    const spots = [...courts.map((c) => c.name), ...CLUB_SPOTS];
    if (!f.clubSpot || !spots.includes(f.clubSpot)) return { error: "Tell us where in the club to bring it" };
    return { data: { clubSpot: f.clubSpot, address: null, deliveryPhone: null, pincode: null } };
  }
  if (!f.line1 || f.line1.length < 5) return { error: "Enter your house or flat number and building" };
  if (!f.line2 || f.line2.length < 3) return { error: "Enter your street or area" };
  if (!f.city || f.city.length < 2) return { error: "Enter your city" };
  if (!f.state || !INDIAN_STATES.includes(f.state)) return { error: "Choose your state" };
  if (!f.pincode || !isPincode(f.pincode)) return { error: "Enter a valid 6-digit PIN code" };
  const phone = normalizePhone(f.phone || memberPhone);
  if (!phone) return { error: "Enter a 10-digit mobile number for the delivery" };
  const address = formatAddress({ line1: f.line1, line2: f.line2, landmark: f.landmark, city: f.city, state: f.state, pincode: f.pincode.trim() });
  return { data: { clubSpot: null, address, deliveryPhone: phone, pincode: f.pincode.trim() } };
}

export async function placeOrder(_: ShopState, formData: FormData): Promise<ShopState> {
  const member = await requireMember();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const where = await deliveryDetails(parsed.data, member.phone);
  if (where.error || !where.data) return { error: where.error };
  const rule = await getShippingRule();

  let lines: { productId: number; qty: number }[];
  try {
    lines = z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1).max(10) })).parse(JSON.parse(parsed.data.items));
  } catch {
    return { error: "Add something to your order first" };
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } } });
      const err = stockError(lines, products);
      if (err) throw new Error(err);
      for (const l of lines) {
        const res = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
        if (res.count !== 1) throw new Error("Someone just bought the last one, please check your order");
      }
      const plan = benefitPlan(member);
      const priced = lines.map((l) => ({ ...l, unitPrice: products.find((p) => p.id === l.productId)!.price }));
      const t = cartTotals(priced, plan, "shop");
      const shipping = shippingFor(parsed.data.fulfilment, t.total, rule);
      return tx.order.create({
        data: {
          memberId: member.id,
          customerName: member.name,
          customerPhone: member.phone,
          channel: "online",
          fulfilment: parsed.data.fulfilment,
          ...where.data,
          shipping,
          status: "pending",
          subtotal: t.subtotal,
          discount: t.discount,
          total: t.total + shipping,
          items: { create: priced.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })) },
        },
      });
    });
    revalidatePath("/me/shop");
    revalidatePath("/staff/shop");
    revalidatePath("/staff");
    return {
      ok:
        parsed.data.fulfilment === "club"
          ? `Order #${order.id} placed, ${inr(order.total)}. We’ll bring it to you at ${order.clubSpot}. Pay when it arrives.`
          : `Order #${order.id} placed, ${inr(order.total)}${order.shipping ? ` including ${inr(order.shipping)} shipping` : " with free shipping"}. Pay by cash or UPI on delivery.`,
      at: Date.now(),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not place the order" };
  }
}
