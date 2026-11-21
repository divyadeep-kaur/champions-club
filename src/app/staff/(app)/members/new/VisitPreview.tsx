import { inr } from "@/lib/constants";
import { sampleVisit, type PlanPricing } from "@/lib/pricing";

export type Visit = { walkInRate: number; shopItem: number; barItem: number; labels: { court: string; shop: string; bar: string } };

export function VisitPreview({ plans, visit, selectedId }: { plans: (PlanPricing & { id: number; name: string })[]; visit: Visit; selectedId: number }) {
  const walkIn = sampleVisit(null, visit);
  const cols = [{ id: 0, name: "Walk-in", price: walkIn }, ...plans.map((p) => ({ id: p.id, name: p.name, price: sampleVisit(p, visit) }))];
  const rows = [
    { key: "court", label: visit.labels.court },
    { key: "shop", label: visit.labels.shop },
    { key: "bar", label: visit.labels.bar },
  ] as const;

  return (
    <section aria-labelledby="visit-title" className="border border-line bg-paper">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-3">
        <h3 id="visit-title" className="font-serif text-[19px] font-medium text-forest">
          What do I pay for one visit?
        </h3>
        <p className="text-[13px] text-muted">Same prices the counter and bar will charge</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[14.5px]">
          <thead>
            <tr className="text-left text-[12.5px] font-semibold uppercase tracking-[0.06em] text-muted">
              <th scope="col" className="px-4 py-2.5 font-semibold">
                <span className="sr-only">Item</span>
              </th>
              {cols.map((c) => (
                <th key={c.id} scope="col" className={`px-4 py-2.5 text-right font-semibold ${c.id === selectedId ? "bg-forest/[0.06] text-forest" : ""}`}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink">
                  {r.label}
                </th>
                {cols.map((c) => (
                  <td key={c.id} className={`px-4 py-2.5 text-right tabular-nums ${c.id === selectedId ? "bg-forest/[0.06]" : ""}`}>
                    {c.price[r.key] === 0 ? "Free" : inr(c.price[r.key])}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-forest/30 font-semibold">
              <th scope="row" className="px-4 py-3 text-left">
                Visit total
              </th>
              {cols.map((c) => (
                <td key={c.id} className={`px-4 py-3 text-right tabular-nums ${c.id === selectedId ? "bg-forest/[0.06] text-forest" : ""}`}>
                  {inr(c.price.total)}
                  {c.id !== 0 && <span className="block text-[12.5px] font-medium text-[#4d7a12]">saves {inr(walkIn.total - c.price.total)}</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
