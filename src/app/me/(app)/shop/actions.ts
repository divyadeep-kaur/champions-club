"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cartTotals, stockError } from "@/lib/checkout";
import { inr } from "@/lib/constants";
import { membershipStatus } from "@/lib/members";
import { requireMember } from "@/lib/memberSession";

export type ShopState = { error?: string; ok?: string; at?: number };

const schema = z.object({
  items: z.string(),
  fulfilment: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(200).optional(),
});

export async function placeOrder(_: ShopState, formData: FormData): Promise<ShopState> {
  const member = await requireMember();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose pickup or delivery" };
  if (parsed.data.fulfilment === "delivery" && (parsed.data.address?.length ?? 0) < 10) return { error: "Enter your full delivery address" };

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
      const plan = membershipStatus(member.endDate).status === "expired" ? null : member.plan;
      const priced = lines.map((l) => ({ ...l, unitPrice: products.find((p) => p.id === l.productId)!.price }));
      const t = cartTotals(priced, plan, "shop");
      return tx.order.create({
        data: {
          memberId: member.id,
          customerName: member.name,
          customerPhone: member.phone,
          channel: "online",
          fulfilment: parsed.data.fulfilment,
          address: parsed.data.fulfilment === "delivery" ? parsed.data.address : null,
          status: "pending",
          subtotal: t.subtotal,
          discount: t.discount,
          total: t.total,
          items: { create: priced.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })) },
        },
      });
    });
    revalidatePath("/me/shop");
    revalidatePath("/staff/shop");
    revalidatePath("/staff");
    return {
      ok: `Order #${order.id} placed, ${inr(order.total)}. ${parsed.data.fulfilment === "pickup" ? "We’ll keep it at the front desk, pay when you collect." : "Pay by cash or UPI when it arrives."}`,
      at: Date.now(),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not place the order" };
  }
}
