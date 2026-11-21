"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cartTotals, stockError } from "@/lib/checkout";
import { inr } from "@/lib/constants";
import { membershipStatus } from "@/lib/members";
import { requireStaff } from "@/lib/session";

export type SaleState = { error?: string; ok?: string; at?: number };

const saleSchema = z.object({
  items: z.string(),
  member: z.string().optional(),
  method: z.enum(["cash", "card", "upi"]),
});

const refresh = () => {
  revalidatePath("/me");
  revalidatePath("/me/shop");
  revalidatePath("/staff/shop");
  revalidatePath("/staff");
  revalidatePath("/");
};

export async function counterSale(_: SaleState, formData: FormData): Promise<SaleState> {
  await requireStaff(["owner", "desk", "shop"]);
  const parsed = saleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Pick how they paid" };

  let lines: { productId: number; qty: number }[];
  try {
    lines = z.array(z.object({ productId: z.number().int(), qty: z.number().int().min(1).max(50) })).parse(JSON.parse(parsed.data.items));
  } catch {
    return { error: "Add products to start a sale" };
  }

  const code = parsed.data.member?.match(/CC-\d{4}/i)?.[0]?.toUpperCase();
  if (parsed.data.member?.trim() && !code) return { error: "Pick the member from the list, or clear the field for a walk-in" };

  try {
    const result = await db.$transaction(async (tx) => {
      const member = code ? await tx.member.findUnique({ where: { code }, include: { plan: true } }) : null;
      if (code && !member) throw new Error(`No member with code ${code}`);
      const plan = member && membershipStatus(member.endDate).status !== "expired" ? member.plan : null;

      const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } } });
      const err = stockError(lines, products);
      if (err) throw new Error(err);

      for (const l of lines) {
        const res = await tx.product.updateMany({ where: { id: l.productId, stock: { gte: l.qty } }, data: { stock: { decrement: l.qty } } });
        if (res.count !== 1) throw new Error("Stock changed while you were selling, try again");
      }

      const priced = lines.map((l) => ({ ...l, unitPrice: products.find((p) => p.id === l.productId)!.price }));
      const t = cartTotals(priced, plan, "shop");
      const order = await tx.order.create({
        data: {
          memberId: member?.id,
          customerName: member?.name ?? "Walk-in customer",
          customerPhone: member?.phone,
          channel: "counter",
          fulfilment: "counter",
          status: "completed",
          subtotal: t.subtotal,
          discount: t.discount,
          total: t.total,
          paymentMethod: parsed.data.method,
          items: { create: priced.map((l) => ({ productId: l.productId, qty: l.qty, unitPrice: l.unitPrice })) },
        },
      });
      const names = priced.map((l) => `${products.find((p) => p.id === l.productId)!.name}${l.qty > 1 ? ` ×${l.qty}` : ""}`).join(", ");
      await tx.payment.create({ data: { source: "shop", refId: order.id, amount: t.total, method: parsed.data.method, note: names } });
      return `Paid ${inr(t.total)} by ${parsed.data.method.toUpperCase()}${t.discount ? ` · ${member!.name.split(" ")[0]} saved ${inr(t.discount)}` : ""} · stock updated`;
    });
    refresh();
    return { ok: result, at: Date.now() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not take the payment" };
  }
}

const next: Record<string, string> = { pending: "ready", ready: "completed" };

export async function advanceOrder(formData: FormData) {
  await requireStaff(["owner", "desk", "shop"]);
  const order = await db.order.findUnique({ where: { id: Number(formData.get("orderId")) }, include: { items: { include: { product: true } } } });
  if (!order || !next[order.status]) return;
  const finishing = next[order.status] === "completed";
  const method = String(formData.get("method") ?? "");
  const needsPayment = finishing && !order.paymentMethod;
  if (needsPayment && !["cash", "card", "upi"].includes(method)) return;
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: next[order.status], ...(needsPayment ? { paymentMethod: method } : {}) } }),
    ...(needsPayment
      ? [
          db.payment.create({
            data: {
              source: "shop",
              refId: order.id,
              amount: order.total,
              method,
              note: `Online order #${order.id}: ${order.items.map((i) => i.product.name).join(", ")}`,
            },
          }),
        ]
      : []),
  ]);
  refresh();
}

export async function cancelOrder(formData: FormData) {
  await requireStaff(["owner", "desk", "shop"]);
  const order = await db.order.findUnique({ where: { id: Number(formData.get("orderId")) }, include: { items: true } });
  if (!order || order.status === "completed" || order.status === "cancelled") return;
  const paid = await db.payment.aggregate({ where: { source: "shop", refId: order.id }, _sum: { amount: true } });
  await db.$transaction([
    db.order.update({ where: { id: order.id }, data: { status: "cancelled" } }),
    ...order.items.map((i) => db.product.update({ where: { id: i.productId }, data: { stock: { increment: i.qty } } })),
    ...((paid._sum.amount ?? 0) > 0
      ? [
          db.payment.create({
            data: {
              source: "shop",
              refId: order.id,
              amount: -(paid._sum.amount ?? 0),
              method: order.paymentMethod ?? "cash",
              note: `Refund, cancelled order #${order.id}`,
            },
          }),
        ]
      : []),
  ]);
  refresh();
}

export async function restock(formData: FormData) {
  await requireStaff(["owner", "desk", "shop"]);
  const id = Number(formData.get("productId"));
  const qty = Math.min(200, Math.max(1, Number(formData.get("qty")) || 0));
  await db.product.update({ where: { id }, data: { stock: { increment: qty } } });
  refresh();
}
