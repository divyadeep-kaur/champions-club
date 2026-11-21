import { barPrice, shopPrice, type PlanPricing } from "./pricing";

export function cartTotals(lines: { unitPrice: number; qty: number }[], plan: PlanPricing | null, kind: "shop" | "bar") {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const total = kind === "shop" ? shopPrice(plan, subtotal) : barPrice(plan, subtotal);
  return { subtotal, discount: subtotal - total, total };
}

export function stockError(lines: { productId: number; qty: number }[], shelf: { id: number; name: string; stock: number }[]) {
  if (lines.length === 0) return "Add products to start a sale";
  const wanted = new Map<number, number>();
  for (const l of lines) wanted.set(l.productId, (wanted.get(l.productId) ?? 0) + l.qty);
  for (const [id, qty] of wanted) {
    const p = shelf.find((s) => s.id === id);
    if (!p) return "A product in the cart is no longer sold";
    if (qty > p.stock) return p.stock <= 0 ? `${p.name} is sold out` : `Only ${p.stock} ${p.name} left`;
  }
  return null;
}
