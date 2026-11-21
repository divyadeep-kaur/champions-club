import { PrismaClient, type Member } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

export const DEMO_PASSWORD = "champions123";

let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];

const day = 24 * 60 * 60 * 1000;
const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const at = (daysFromToday: number, hour: number, minute = 0) => {
  const d = new Date(startOfToday.getTime() + daysFromToday * day);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  await db.payment.deleteMany();
  await db.tabItem.deleteMany();
  await db.tab.deleteMany();
  await db.shift.deleteMany();
  await db.barTable.deleteMany();
  await db.menuItem.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.product.deleteMany();
  await db.socialPlayer.deleteMany();
  await db.booking.deleteMany();
  await db.court.deleteMany();
  await db.lead.deleteMany();
  await db.member.deleteMany();
  await db.plan.deleteMany();
  await db.staff.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const [owner, desk, bar] = await Promise.all([
    db.staff.create({ data: { name: "Ritika Malhotra", email: "owner@champions.club", passwordHash, role: "owner" } }),
    db.staff.create({ data: { name: "Aman Gill", email: "desk@champions.club", passwordHash, role: "desk" } }),
    db.staff.create({ data: { name: "Sana Sheikh", email: "bar@champions.club", passwordHash, role: "bar" } }),
  ]);

  const gold = await db.plan.create({
    data: { name: "Gold", monthlyFee: 3999, courtRate: 0, shopDiscount: 15, barDiscount: 20, description: "Unlimited court time, priority booking, best discounts" },
  });
  const silver = await db.plan.create({
    data: { name: "Silver", monthlyFee: 2499, courtRate: 300, shopDiscount: 10, barDiscount: 10, description: "Member court rates and shop and bar discounts" },
  });
  const junior = await db.plan.create({
    data: { name: "Junior", monthlyFee: 1499, courtRate: 150, shopDiscount: 10, barDiscount: 0, description: "For players under 18, discounted courts and coaching days" },
  });

  const courts = await Promise.all(
    [
      { name: "Tennis Court 1", sport: "tennis", walkInRate: 800 },
      { name: "Tennis Court 2", sport: "tennis", walkInRate: 800 },
      { name: "Tennis Court 3", sport: "tennis", walkInRate: 800 },
      { name: "Tennis Court 4", sport: "tennis", walkInRate: 800 },
      { name: "Cricket Net 1", sport: "cricket", walkInRate: 1000 },
      { name: "Cricket Net 2", sport: "cricket", walkInRate: 1000 },
    ].map((data) => db.court.create({ data })),
  );

  const people: [string, string, typeof gold, number][] = [
    ["Arjun Mehta", "9876543210", gold, 40],
    ["Priya Sharma", "9812345678", gold, 12],
    ["Kabir Singh", "9898989898", silver, 25],
    ["Ananya Iyer", "9822113344", silver, 3],
    ["Rohan Verma", "9811122233", silver, -4],
    ["Meera Nair", "9845012345", gold, 55],
    ["Ishaan Kapoor", "9900112233", junior, 20],
    ["Diya Patel", "9876001122", junior, 6],
    ["Vikram Rao", "9811900077", silver, 18],
    ["Neha Joshi", "9833445566", gold, 28],
    ["Harleen Kaur", "9888776655", silver, 9],
    ["Aditya Bose", "9765432109", junior, -12],
  ];
  const members: Member[] = [];
  for (const [i, [name, phone, plan, daysLeft]] of people.entries()) {
    const endDate = new Date(startOfToday.getTime() + daysLeft * day);
    members.push(
      await db.member.create({
        data: {
          code: `CC-${String(i + 1).padStart(4, "0")}`,
          name,
          phone,
          email: `${name.split(" ")[0].toLowerCase()}@example.com`,
          planId: plan.id,
          birthDate: plan.id === junior.id ? new Date(2010 + (i % 4), i % 12, 10) : new Date(1988 + (i % 12), i % 12, 15),
          startDate: new Date(endDate.getTime() - plan.durationDays * day),
          endDate,
        },
      }),
    );
  }

  const planOf = (m: (typeof members)[number]) => [gold, silver, junior].find((p) => p.id === m.planId)!;

  for (let d = -6; d <= 1; d++) {
    for (const court of courts) {
      for (const hour of [7, 9, 17, 18, 19, 20]) {
        if (rand() < 0.45) continue;
        const member = rand() < 0.75 ? pick(members) : null;
        const start = at(d, hour, rand() < 0.5 ? 0 : 30);
        const price = member ? planOf(member).courtRate : court.walkInRate;
        const booking = await db.booking.create({
          data: {
            courtId: court.id,
            memberId: member?.id,
            guestName: member ? null : pick(["Walk-in: Raj", "Walk-in: Simran", "Walk-in: Tarun", "Walk-in: Pooja"]),
            guestPhone: member ? null : "9000000000",
            start,
            end: new Date(start.getTime() + 60 * 60 * 1000),
            price,
          },
        });
        if (price > 0 && d <= 0) {
          await db.payment.create({
            data: { source: "court", refId: booking.id, amount: price, method: pick(["cash", "card", "upi", "upi"]), createdAt: start },
          });
        }
      }
    }
  }

  const products = await Promise.all(
    [
      ["RKT-001", "Pro Tour Racket", "rackets", 7499, 6],
      ["RKT-002", "Junior Racket 25\"", "rackets", 2299, 3],
      ["BAL-001", "Tennis Balls (can of 3)", "balls", 499, 40],
      ["BAL-002", "Leather Cricket Ball", "balls", 899, 4],
      ["SHO-001", "Clay Court Shoes", "shoes", 5999, 8],
      ["SHO-002", "All Court Shoes", "shoes", 4499, 2],
      ["ACC-001", "Overgrip (3 pack)", "accessories", 349, 25],
      ["ACC-002", "Racket Restring", "accessories", 899, 99],
      ["ACC-003", "Wristbands", "accessories", 299, 15],
      ["APP-001", "Club Polo Tee", "apparel", 1299, 18],
      ["APP-002", "Performance Shorts", "apparel", 1499, 5],
      ["APP-003", "Club Cap", "apparel", 699, 12],
    ].map(([sku, name, category, price, stock]) =>
      db.product.create({ data: { sku: sku as string, name: name as string, category: category as string, price: price as number, stock: stock as number } }),
    ),
  );

  for (let i = 0; i < 18; i++) {
    const d = -Math.floor(rand() * 28);
    const member = rand() < 0.6 ? pick(members) : null;
    const product = pick(products);
    const qty = 1 + Math.floor(rand() * 2);
    const subtotal = product.price * qty;
    const discount = member ? Math.round((subtotal * planOf(member).shopDiscount) / 100) : 0;
    const online = rand() < 0.3;
    const createdAt = at(d, 10 + Math.floor(rand() * 10));
    const method = online ? "online" : pick(["cash", "card", "upi"]);
    const order = await db.order.create({
      data: {
        memberId: member?.id,
        customerName: member?.name ?? "Walk-in customer",
        channel: online ? "online" : "counter",
        fulfilment: online ? pick(["pickup", "delivery"]) : "counter",
        status: d === 0 && online ? "pending" : "completed",
        subtotal,
        discount,
        total: subtotal - discount,
        paymentMethod: method,
        createdAt,
        items: { create: [{ productId: product.id, qty, unitPrice: product.price }] },
      },
    });
    await db.payment.create({ data: { source: "shop", refId: order.id, amount: order.total, method, createdAt } });
  }

  const menu = await Promise.all(
    [
      ["Fresh Lime Soda", "drinks", 120],
      ["Cold Coffee", "drinks", 180],
      ["Masala Chai", "drinks", 60],
      ["Electrolyte Cooler", "drinks", 150],
      ["Craft Beer (pint)", "drinks", 380],
      ["Paneer Tikka Wrap", "food", 260],
      ["Chicken Club Sandwich", "food", 290],
      ["Veg Hakka Noodles", "food", 240],
      ["Protein Bowl", "food", 320],
      ["French Fries", "food", 150],
    ].map(([name, category, price]) => db.menuItem.create({ data: { name: name as string, category: category as string, price: price as number } })),
  );

  const tables = await Promise.all(["T1", "T2", "T3", "T4", "T5", "T6", "Patio 1", "Patio 2"].map((label) => db.barTable.create({ data: { label } })));

  for (let d = -27; d <= 0; d++) {
    const shift = await db.shift.create({ data: { staffId: bar.id, start: at(d, 16), end: d < 0 ? at(d, 23) : null } });
    const tabsToday = 3 + Math.floor(rand() * 5);
    for (let t = 0; t < tabsToday; t++) {
      const member = rand() < 0.55 ? pick(members) : null;
      const lines = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => ({ item: pick(menu), qty: 1 + Math.floor(rand() * 2) }));
      const subtotal = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);
      const discount = member ? Math.round((subtotal * planOf(member).barDiscount) / 100) : 0;
      const openedAt = at(d, 17 + Math.floor(rand() * 5), Math.floor(rand() * 60));
      const open = d === 0 && t < 2;
      const method = pick(["cash", "card", "upi", "upi"]);
      const tab = await db.tab.create({
        data: {
          tableId: pick(tables).id,
          memberId: member?.id,
          guestName: member ? null : pick(["Guest", "Table guests", "Visitor"]),
          shiftId: shift.id,
          status: open ? "open" : "paid",
          subtotal,
          discount,
          total: subtotal - discount,
          paymentMethod: open ? null : method,
          openedAt,
          closedAt: open ? null : new Date(openedAt.getTime() + 50 * 60 * 1000),
          items: { create: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty, unitPrice: l.item.price, createdAt: openedAt })) },
        },
      });
      if (!open) await db.payment.create({ data: { source: "bar", refId: tab.id, amount: tab.total, method, createdAt: tab.closedAt! } });
    }
  }

  for (const m of members) {
    const plan = planOf(m);
    await db.payment.create({ data: { source: "membership", refId: m.id, amount: plan.monthlyFee, method: pick(["card", "upi", "online"]), createdAt: m.startDate } });
  }

  await db.lead.createMany({
    data: [
      { name: "Karan Arora", phone: "9811000001", interest: "trial", message: "Can I try a tennis session this weekend?", preferredAt: at(2, 18), status: "new" },
      { name: "Simran Dhillon", phone: "9811000002", email: "simran@example.com", interest: "membership", message: "Family membership for two adults and a kid", status: "contacted", createdAt: at(-2, 12) },
      { name: "Tech Park Pvt Ltd", phone: "9811000003", interest: "membership", message: "Corporate plan for 20 employees", status: "quoted", quoteAmount: 45000, createdAt: at(-5, 11) },
      { name: "Rahul Khanna", phone: "9811000004", interest: "trial", preferredAt: at(1, 7), status: "new", createdAt: at(0, 9) },
      { name: "Nidhi Saxena", phone: "9811000005", interest: "membership", status: "won", createdAt: at(-9, 15) },
    ],
  });

  console.log(`Seeded: 3 staff (${owner.email}, ${desk.email}, ${bar.email}), ${members.length} members, ${courts.length} courts, ${products.length} products, ${menu.length} menu items.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
