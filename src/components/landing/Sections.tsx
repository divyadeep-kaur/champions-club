import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { inr } from "@/lib/constants";

type Plan = { id: number; name: string; monthlyFee: number; courtRate: number; shopDiscount: number; barDiscount: number; durationDays: number; description: string };
type Product = { id: number; name: string; category: string; price: number; stock: number; lowStockAt: number };
type MenuItem = { id: number; name: string; category: string; price: number };

function SectionHead({ id, title, sub }: { id: string; title: React.ReactNode; sub: string }) {
  return (
    <div id={id} className="scroll-mt-6">
      <h2 className="font-serif text-[40px] font-semibold leading-[1] tracking-[-0.03em] text-forest sm:text-[52px]">{title}</h2>
      <p className="mt-3 max-w-[560px] text-[17px] text-ink">{sub}</p>
    </div>
  );
}

export function Memberships({ plans, walkIn }: { plans: Plan[]; walkIn: number }) {
  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8">
        <SectionHead id="memberships" title={<>Pick your <em className="font-medium">plan</em></>} sub={`Walk-ins pay ${inr(walkIn)} an hour. Members pay less on court, in the shop and at the café.`} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const featured = p.name === "Gold";
            return (
              <article key={p.id} className={`flex flex-col border p-6 ${featured ? "border-forest bg-forest text-cream" : "border-line bg-cream/40"}`}>
                <div className="flex items-baseline justify-between">
                  <h3 className={`font-serif text-[30px] font-semibold ${featured ? "" : "text-forest"}`}>{p.name}</h3>
                  {featured && <span className="bg-ball px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-forest-deep">Most popular</span>}
                </div>
                <p className="mt-2 font-serif text-[38px] font-semibold leading-none tabular-nums">
                  {inr(p.monthlyFee)}
                  <span className={`ml-1 font-sans text-[15px] font-normal ${featured ? "text-cream/70" : "text-muted"}`}>/ {p.durationDays} days</span>
                </p>
                <p className={`mt-3 text-[15px] ${featured ? "text-cream/80" : "text-muted"}`}>{p.description}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-[15px]">
                  {[
                    p.courtRate === 0 ? "Court time included" : `Courts at ${inr(p.courtRate)}/hr (save ${inr(walkIn - p.courtRate)})`,
                    `${p.shopDiscount}% off in the gear shop`,
                    p.barDiscount ? `${p.barDiscount}% off at the café & bar` : "Café at regular prices",
                    "Book and order from your phone",
                  ].map((perk) => (
                    <li key={perk} className="flex gap-2.5">
                      <Check className={`mt-0.5 size-4 shrink-0 ${featured ? "text-ball" : "text-forest"}`} strokeWidth={2.5} />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/trial?${new URLSearchParams({ interest: "membership", plan: p.name })}`}
                  className={`mt-6 inline-flex items-center justify-center gap-2 px-5 py-3 text-[15.5px] font-semibold ${featured ? "bg-cream text-forest hover:bg-white" : "bg-forest text-cream hover:bg-forest-deep"}`}
                >
                  Join {p.name}
                  <ArrowUpRight className="size-4" />
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-[14.5px] text-muted">
          Junior is for players under 18. Already a member?{" "}
          <Link href="/me/login" className="font-semibold text-forest underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}

function stockLabel(p: Product) {
  if (p.stock <= 0) return { text: "Sold out", cls: "text-muted" };
  if (p.stock <= p.lowStockAt) return { text: `Only ${p.stock} left`, cls: "text-clay" };
  return { text: "In stock", cls: "text-[#4d7a12]" };
}

export function Shop({ products, bestDiscount }: { products: Product[]; bestDiscount: number }) {
  const categories = [...new Set(products.map((p) => p.category))];
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-[1320px] px-4 py-20 sm:px-8">
        <SectionHead id="shop" title={<>The gear <em className="font-medium">shop</em></>} sub={`Rackets, balls, shoes and kit at the club counter. Snapped a string before a match? We restring on the spot. Members save up to ${bestDiscount}%.`} />
        <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="border-b border-forest pb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-forest">{cat}</h3>
              <ul className="divide-y divide-line">
                {products
                  .filter((p) => p.category === cat)
                  .map((p) => {
                    const s = stockLabel(p);
                    return (
                      <li key={p.id} className="flex items-baseline justify-between gap-4 py-3">
                        <span>
                          <span className="block text-[15.5px] font-medium text-ink">{p.name}</span>
                          <span className={`block text-[13px] font-medium ${s.cls}`}>{s.text}</span>
                        </span>
                        <span className="text-[15.5px] tabular-nums text-ink">{inr(p.price)}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cafe({ menu, bestDiscount }: { menu: MenuItem[]; bestDiscount: number }) {
  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-20 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
        <div>
          <SectionHead id="cafe" title={<>Café <em className="font-medium">&amp; bar</em></>} sub="Cold drinks and proper food after the match. Members order from their table on their phone, run a tab and settle before they leave." />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/me/cafe" className="inline-flex items-center gap-2 bg-forest px-5 py-3 text-[15.5px] font-semibold text-cream hover:bg-forest-deep">
              Order from your table
              <ArrowUpRight className="size-4" />
            </Link>
            <span className="self-center text-[14.5px] text-muted">Members save up to {bestDiscount}%</span>
          </div>
        </div>
        <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {(["drinks", "food"] as const).map((cat) => (
            <div key={cat}>
              <h3 className="border-b border-forest pb-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-forest">{cat}</h3>
              <ul className="divide-y divide-line">
                {menu
                  .filter((m) => m.category === cat)
                  .map((m) => (
                    <li key={m.id} className="flex items-baseline justify-between gap-4 py-3 text-[15.5px]">
                      <span className="text-ink">{m.name}</span>
                      <span className="tabular-nums text-ink">{inr(m.price)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
