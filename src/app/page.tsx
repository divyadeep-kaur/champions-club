import { db } from "@/lib/db";
import { landingCourts } from "@/lib/publicData";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Cafe, Memberships, Shop } from "@/components/landing/Sections";
import { Footer } from "@/components/landing/Footer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [courts, plans, products, menu, walkIn] = await Promise.all([
    landingCourts(),
    db.plan.findMany({ orderBy: { monthlyFee: "desc" } }),
    db.product.findMany({ orderBy: [{ category: "asc" }, { price: "desc" }] }),
    db.menuItem.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { price: "asc" }] }),
    db.court.aggregate({ _min: { walkInRate: true } }),
  ]);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero courts={courts} />
      <Memberships plans={plans} walkIn={walkIn._min.walkInRate ?? 0} />
      <Shop products={products} bestDiscount={Math.max(0, ...plans.map((p) => p.shopDiscount))} />
      <Cafe menu={menu} bestDiscount={Math.max(0, ...plans.map((p) => p.barDiscount))} />
      <Footer />
    </main>
  );
}
