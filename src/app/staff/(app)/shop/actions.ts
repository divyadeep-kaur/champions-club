"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { cartTotals, stockError } from "@/lib/checkout";
import { inr } from "@/lib/constants";
import { benefitPlan, photoError } from "@/lib/membership";
import { nextSku } from "@/lib/inventory";
import { FREE_OVER_KEY, SHIPPING_FEE_KEY } from "@/lib/delivery";
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
      const plan = benefitPlan(member);

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

export type InventoryState = { error?: string; ok?: string; at?: number; fields?: Record<string, string> };

const restockSchema = z.object({
  productId: z.coerce.number().int().positive(),
  qty: z.coerce.number({ message: "Enter how many arrived" }).int("Whole items only").min(1, "Add at least one").max(1000, "That's more than 1,000 at once"),
  cost: z.union([z.literal(""), z.coerce.number().int("Whole rupees only").min(1).max(10_000_000)]).optional(),
  supplier: z.string().trim().max(80).optional(),
});

// Adds new stock. If a cost is given it is also recorded in Income as a paid stock purchase.
export async function restockProduct(_: InventoryState, formData: FormData): Promise<InventoryState> {
  const staff = await requireStaff(["owner", "desk", "shop"]);
  const parsed = restockSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { productId, qty, cost, supplier } = parsed.data;
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product not found" };
  await db.$transaction([
    db.product.update({ where: { id: productId }, data: { stock: { increment: qty } } }),
    ...(cost
      ? [
          db.expense.create({
            data: {
              category: "stock",
              description: `Restock: ${qty} × ${product.name} (${product.sku})`,
              vendor: supplier || null,
              amount: cost,
              dueDate: new Date(),
              paidAt: new Date(),
              method: "bank",
            },
          }),
        ]
      : []),
  ]);
  refresh();
  revalidatePath("/staff/money", "layout");
  return { ok: `+${qty} ${product.name}. Now ${product.stock + qty} in stock${cost ? `, ${inr(cost)} added to Income` : ""}.`, at: Date.now() };
}

const productSchema = z.object({
  name: z.string().trim().min(2, "Enter the product name").max(80),
  category: z.string().trim().max(30).optional().default(""),
  newCategory: z.string().trim().max(30).optional().default(""),
  price: z.coerce.number({ message: "Enter the price" }).int("Whole rupees only").min(1, "Enter the price").max(1_000_000),
  stock: z.coerce.number({ message: "Enter the opening stock" }).int("Whole items only").min(0).max(10_000),
  lowStockAt: z.coerce.number().int().min(0).max(1000).default(5),
});

// Adds a new product to the shop with an automatic product code.
export async function addProduct(_: InventoryState, formData: FormData): Promise<InventoryState> {
  await requireStaff(["owner", "desk", "shop"]);
  const fields = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const parsed = productSchema.safeParse(fields);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const f = parsed.data;
  const category = (f.newCategory || f.category).toLowerCase();
  if (category.length < 2) return { error: "Pick a category or type a new one", fields };
  const existing = await db.product.findMany({ select: { sku: true, name: true } });
  if (existing.some((p) => p.name.toLowerCase() === f.name.toLowerCase()))
    return { error: "A product with that name already exists. Restock it instead.", fields };

  let photo: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const problem = photoError(file);
    if (problem) return { error: problem, fields };
    photo = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  }

  const sku = nextSku(
    category,
    existing.map((p) => p.sku),
  );
  await db.product.create({ data: { sku, name: f.name, category, price: f.price, stock: f.stock, lowStockAt: f.lowStockAt, photo } });
  refresh();
  return { ok: `${f.name} added as ${sku}`, at: Date.now() };
}

const shippingSchema = z.object({
  fee: z.coerce.number({ message: "Enter the shipping charge" }).int("Whole rupees only").min(0).max(10_000),
  freeOver: z.coerce.number().int("Whole rupees only").min(0).max(1_000_000),
});

// Home delivery charges. Only the owner sets them; they apply to new orders.
export async function setShipping(_: InventoryState, formData: FormData): Promise<InventoryState> {
  await requireStaff(["owner"]);
  const parsed = shippingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.$transaction([
    db.clubSetting.upsert({
      where: { key: SHIPPING_FEE_KEY },
      create: { key: SHIPPING_FEE_KEY, value: String(parsed.data.fee) },
      update: { value: String(parsed.data.fee) },
    }),
    db.clubSetting.upsert({
      where: { key: FREE_OVER_KEY },
      create: { key: FREE_OVER_KEY, value: String(parsed.data.freeOver) },
      update: { value: String(parsed.data.freeOver) },
    }),
  ]);
  refresh();
  return { ok: "Delivery charges saved", at: Date.now() };
}
