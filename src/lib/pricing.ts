export type PlanPricing = { courtRate: number; shopDiscount: number; barDiscount: number };

export const applyDiscount = (amount: number, percent: number) => amount - Math.round((amount * percent) / 100);

export const courtPrice = (plan: Pick<PlanPricing, "courtRate"> | null, walkInRate: number) => (plan ? plan.courtRate : walkInRate);

export const shopPrice = (plan: PlanPricing | null, amount: number) => applyDiscount(amount, plan?.shopDiscount ?? 0);

export const barPrice = (plan: PlanPricing | null, amount: number) => applyDiscount(amount, plan?.barDiscount ?? 0);

export function sampleVisit(plan: PlanPricing | null, visit: { walkInRate: number; shopItem: number; barItem: number }) {
  const court = courtPrice(plan, visit.walkInRate);
  const shop = shopPrice(plan, visit.shopItem);
  const bar = barPrice(plan, visit.barItem);
  return { court, shop, bar, total: court + shop + bar };
}
