import { db } from "@/lib/db";
import { inr, MAX_BOOKINGS_PER_DAY } from "@/lib/constants";
import { barPrice } from "@/lib/pricing";
import { landingCourts, weekGlance } from "@/lib/publicData";
import { Navbar } from "@/components/landing/Navbar";
import { ClubVideo } from "@/components/landing/ClubVideo";
import { Footer } from "@/components/landing/Footer";
import { Coaches } from "@/components/landing/Coaches";
import { Athletes } from "@/components/landing/Athletes";
import { Contact, Faq, FeatureQuote, Features, HomeHero, OneClub, PerksStrip, Reviews, Sports } from "@/components/landing/Home";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [courts, week, plans, products, menu, rates] = await Promise.all([
    landingCourts(),
    weekGlance("tennis"),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.product.findMany({ where: { sku: { in: ["RKT-001", "BAL-001", "SHO-002", "APP-001"] } } }),
    db.menuItem.findMany({ where: { name: { in: ["Paneer Tikka Wrap", "Cold Coffee"] } } }),
    db.court.groupBy({ by: ["sport"], _min: { walkInRate: true }, _count: true }),
  ]);

  const gold = plans.find((p) => p.name === "Gold");
  const silver = plans.find((p) => p.name === "Silver") ?? null;
  const junior = plans.find((p) => p.name === "Junior");
  const tennis = rates.find((r) => r.sport === "tennis");
  const cricket = rates.find((r) => r.sport === "cricket");
  const bestShop = Math.max(0, ...plans.map((p) => p.shopDiscount));
  const bestBar = Math.max(0, ...plans.map((p) => p.barDiscount));

  const wrap = menu.find((m) => m.name === "Paneer Tikka Wrap");
  const coffee = menu.find((m) => m.name === "Cold Coffee");
  const lines = [wrap && { name: `1 × ${wrap.name}`, price: wrap.price }, coffee && { name: `2 × ${coffee.name}`, price: coffee.price * 2 }].filter(
    Boolean,
  ) as { name: string; price: number }[];
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const total = barPrice(silver, subtotal);

  const order = ["RKT-001", "BAL-001", "SHO-002", "APP-001"];

  return (
    <main className="cc-landing min-h-screen overflow-x-hidden">
      <Navbar />
      <HomeHero courts={courts} />
      <PerksStrip
        perks={[
          gold?.courtRate === 0 ? "Free court time on Gold" : "Member court rates",
          `Up to ${bestShop}% off in the shop`,
          `Up to ${bestBar}% off at the bar`,
          "Friday social play",
          "Open 6am–11pm",
        ]}
      />
      <ClubVideo />
      <FeatureQuote />
      <Sports
        text={{
          Tennis: `${tennis?._count ?? 4} courts under floodlights. Walk-ins ${inr(tennis?._min.walkInRate ?? 0)} an hour, members from free.`,
          Cricket: `${cricket?._count ?? 2} turf practice nets. Walk-ins ${inr(cricket?._min.walkInRate ?? 0)} an hour.`,
          "Social play": "Friday evenings on a shared court. Come alone, get matched.",
          Juniors: `Under-18 plan at ${inr(junior?.monthlyFee ?? 0)} a month with discounted courts and coaching days.`,
        }}
      />
      <OneClub />
      <Coaches />
      <Features
        week={week}
        plans={plans}
        products={order.map((sku) => products.find((p) => p.sku === sku)).filter((p) => !!p)}
        cafe={{ lines, plan: silver?.name ?? "Silver", discountPct: silver?.barDiscount ?? 0, discount: subtotal - total, total }}
      />
      <Reviews />
      <Faq
        items={[
          {
            q: "Do I need a membership to play?",
            a: `No. Walk-ins can book a free slot at the front desk at the walk-in rate (${inr(tennis?._min.walkInRate ?? 0)} an hour for tennis). Members book in the app and pay their plan’s court rate.`,
          },
          {
            q: "How many sessions can I book in a day?",
            a: `Members can book up to ${MAX_BOOKINGS_PER_DAY} sessions a day, each from 30 minutes to 2 hours, so everyone gets a fair turn.`,
          },
          {
            q: "How do member discounts work?",
            a: "Give your phone number at the shop counter or bar, or order from the member app, and your plan’s discount is applied automatically.",
          },
          {
            q: "Can I book from my phone?",
            a: "Yes. Members sign in with their phone number and member code to book courts up to 7 days ahead and order café food to their table.",
          },
          { q: "Do you offer corporate or family plans?", a: "We don’t have fixed group plans yet. Send us a message below with your group size and the desk will send you a custom quote." },
        ]}
      />
      <Contact />
      <Athletes />
      <Footer />
    </main>
  );
}
