import { PrismaClient, type Member } from "@prisma/client";
import bcrypt from "bcryptjs";
import { payslip, statutoryDue } from "../src/lib/payroll";

const db = new PrismaClient();

export const DEMO_PASSWORD = "champions123";

let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T>(a: readonly T[]) => a[Math.floor(rand() * a.length)];

const day = 24 * 60 * 60 * 1000;
const now = new Date();
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const at = (daysFromToday: number, hour: number, minute = 0) => {
  const d = new Date(startOfToday.getTime() + daysFromToday * day);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  await db.membershipChange.deleteMany();
  await db.planAudit.deleteMany();
  await db.clubSetting.deleteMany();
  await db.staffInvoice.deleteMany();
  await db.staffQuery.deleteMany();
  await db.payslip.deleteMany();
  await db.invoiceLine.deleteMany();
  await db.invoice.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.expense.deleteMany();
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
  const roster: [string, string, string, string, string, number, number][] = [
    ["Ritika Malhotra", "owner@champions.club", "owner", "management", "Club owner", 0, -900],
    ["Aman Gill", "desk@champions.club", "desk", "front", "Front desk lead", 22000, -620],
    ["Sana Sheikh", "bar@champions.club", "bar", "cafe", "Café manager", 20000, -540],
    ["Arvid Lund", "arvid@champions.club", "coach", "coaching", "Head tennis coach", 45000, -800],
    ["Sara Haddad", "sara@champions.club", "coach", "coaching", "Tennis coach", 38000, -410],
    ["Rohan Mehra", "rohan@champions.club", "coach", "coaching", "Head cricket coach", 42000, -760],
    ["Imran Qureshi", "imran@champions.club", "coach", "coaching", "Junior cricket coach", 32000, -300],
    ["Diego Ramos", "diego@champions.club", "coach", "coaching", "Social play host", 28000, -210],
    ["Neha Bhatia", "neha@champions.club", "desk", "front", "Receptionist", 18000, -180],
    ["Gurpreet Singh", "gurpreet@champions.club", "bar", "cafe", "Cook", 19000, -450],
    ["Pooja Rani", "pooja@champions.club", "bar", "cafe", "Café server", 14500, -120],
    ["Vikram Sood", "vikram@champions.club", "shop", "shop", "Pro shop assistant", 17000, -390],
    ["Harleen Kaur", "harleen@champions.club", "shop", "shop", "Shop cashier", 16000, -150],
    ["Ramesh Kumar", "ramesh@champions.club", "staff", "housekeeping", "Sweeper", 13000, -700],
    ["Sunita Devi", "sunita@champions.club", "staff", "housekeeping", "Sweeper", 13000, -330],
    ["Baldev Singh", "baldev@champions.club", "staff", "security", "Security guard, day", 16500, -650],
    ["Mohan Lal", "mohan@champions.club", "staff", "security", "Security guard, night", 16500, -260],
    ["Jagdish Prasad", "jagdish@champions.club", "staff", "grounds", "Groundsman", 17000, -580],
  ];
  const team: Awaited<ReturnType<typeof db.staff.create>>[] = [];
  for (const [i, [name, email, role, department, jobTitle, monthlySalary, joined]] of roster.entries()) {
    team.push(
      await db.staff.create({
        data: {
          name,
          email,
          passwordHash,
          role,
          department,
          jobTitle,
          monthlySalary,
          code: `STF-${String(i + 1).padStart(3, "0")}`,
          phone: `98140${String(10000 + i * 137).slice(-5)}`,
          joinedAt: at(joined, 10),
        },
      }),
    );
  }
  const [owner, desk, bar] = team;
  const staffNamed = (name: string) => team.find((t) => t.name === name)!;

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && process.env.ADMIN_PASSWORD && adminEmail !== "owner@champions.club") {
    await db.staff.create({
      data: {
        name: process.env.ADMIN_NAME?.trim() || "Club admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
        role: "owner",
        monthlySalary: 0,
      },
    });
  }

  const gold = await db.plan.create({
    data: {
      name: "Gold",
      monthlyFee: 3999,
      courtRate: 0,
      shopDiscount: 15,
      barDiscount: 20,
      description: "Unlimited court time, priority booking, best discounts",
    },
  });
  const silver = await db.plan.create({
    data: { name: "Silver", monthlyFee: 2499, courtRate: 300, shopDiscount: 10, barDiscount: 10, description: "Member court rates and shop and bar discounts" },
  });
  const junior = await db.plan.create({
    data: {
      name: "Junior",
      monthlyFee: 1499,
      courtRate: 150,
      shopDiscount: 10,
      barDiscount: 0,
      description: "For players under 18, discounted courts and coaching days",
    },
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
          createdAt: new Date(endDate.getTime() - plan.durationDays * day),
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
      ["RKT-002", 'Junior Racket 25"', "rackets", 2299, 3],
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
          items: {
            create: lines.map((l) => ({ menuItemId: l.item.id, qty: l.qty, unitPrice: l.item.price, createdAt: openedAt, status: open ? "new" : "served" })),
          },
        },
      });
      if (!open) await db.payment.create({ data: { source: "bar", refId: tab.id, amount: tab.total, method, createdAt: tab.closedAt! } });
    }
  }

  for (const m of members) {
    const plan = planOf(m);
    const method = pick(["card", "upi", "online"]);
    const paid = await db.payment.create({
      data: { source: "membership", refId: m.id, amount: plan.monthlyFee, method, createdAt: m.startDate },
    });
    await db.membershipChange.create({
      data: {
        memberId: m.id,
        kind: "joined",
        toPlanId: plan.id,
        newStart: m.startDate,
        newEnd: m.endDate,
        effectiveDate: m.startDate,
        amount: plan.monthlyFee,
        paymentStatus: "paid",
        paymentId: paid.id,
        method,
        reason: "Signed up at the front desk",
        staffId: desk.id,
        createdAt: m.startDate,
      },
    });
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  await db.expense.createMany({
    data: [
      {
        category: "rent",
        description: "Ground and clubhouse rent",
        vendor: "Landlord",
        amount: 85000,
        dueDate: new Date(monthStart.getTime() + 4 * day),
        paidAt: new Date(monthStart.getTime() + 3 * day),
        method: "bank",
      },
      { category: "stock", description: "Rackets and shoes restock", vendor: "Pro Sports Distributors", amount: 42000, dueDate: at(6, 12) },
      { category: "stock", description: "Café supplies (weekly)", vendor: "FreshFarm Foods", amount: 9800, dueDate: at(2, 12) },
      { category: "utilities", description: "Electricity, floodlights", vendor: "PSPCL", amount: 23500, dueDate: at(9, 12) },
      { category: "other", description: "Court resurfacing (Tennis 3)", vendor: "ClayWorks", amount: 18000, dueDate: at(-3, 12) },
    ],
  });

  const firstDay = at(-27, 0);
  let salaryNo = 0;
  for (let back = 5; back >= 0; back--) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const mEnd = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
    const label = mStart.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const key = `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, "0")}`;
    const grow = 1 - back * 0.04;
    for (let w = new Date(mStart); w < mEnd && w.getTime() + 3 * day < now.getTime(); w = new Date(w.getTime() + 7 * day)) {
      const share = w >= firstDay ? 0.6 : 1;
      for (const [source, weekly] of [
        ["court", 78000],
        ["membership", 72000],
        ["shop", 34000],
        ["bar", 27000],
      ] as const) {
        await db.payment.create({
          data: {
            source,
            amount: Math.round((weekly * share * grow * (0.85 + rand() * 0.3)) / 10) * 10,
            method: pick(["upi", "upi", "card", "cash"]),
            note: "Weekly takings",
            createdAt: new Date(w.getTime() + 3 * day + 20 * 3600 * 1000),
          },
        });
      }
    }
    if (back === 0) continue;
    const paid = (d: number) => new Date(mStart.getTime() + d * day + 11 * 3600 * 1000);
    await db.expense.createMany({
      data: [
        { category: "rent", description: "Ground and clubhouse rent", vendor: "Landlord", amount: 85000, dueDate: paid(4), paidAt: paid(3), method: "bank" },
        {
          category: "utilities",
          description: "Electricity, floodlights",
          vendor: "PSPCL",
          amount: Math.round(21000 + rand() * 6000),
          dueDate: paid(9),
          paidAt: paid(8),
          method: "bank",
        },
        {
          category: "utilities",
          description: "Water and internet",
          vendor: "Municipal / Airtel",
          amount: 4200,
          dueDate: paid(12),
          paidAt: paid(11),
          method: "bank",
        },
        {
          category: "stock",
          description: "Pro shop restock",
          vendor: "Pro Sports Distributors",
          amount: Math.round(36000 + rand() * 12000),
          dueDate: paid(6),
          paidAt: paid(6),
          method: "bank",
        },
        {
          category: "stock",
          description: "Café supplies",
          vendor: "FreshFarm Foods",
          amount: Math.round(30000 + rand() * 8000),
          dueDate: paid(14),
          paidAt: paid(14),
          method: "bank",
        },
        {
          category: "other",
          description: "Court and net upkeep",
          vendor: "ClayWorks",
          amount: Math.round(8000 + rand() * 7000),
          dueDate: paid(18),
          paidAt: paid(18),
          method: "bank",
        },
      ],
    });
    const payDay = new Date(mEnd.getTime() - day + 12 * 3600 * 1000);
    const slips = [];
    for (const t of team.filter((x) => x.monthlySalary > 0 && x.joinedAt < mEnd)) {
      const slip = payslip(t.monthlySalary);
      slips.push(slip);
      const exp = await db.expense.create({
        data: {
          category: "salary",
          description: `Salary ${label} · ${t.name}`,
          vendor: t.name,
          amount: slip.net,
          dueDate: payDay,
          paidAt: payDay,
          method: "bank",
        },
      });
      const ps = await db.payslip.create({
        data: {
          staffId: t.id,
          month: key,
          gross: slip.gross,
          basic: slip.basic,
          hra: slip.hra,
          allowance: slip.allowance,
          pf: slip.pf,
          esi: slip.esi,
          pt: slip.pt,
          advance: slip.advance,
          net: slip.net,
          employerPf: slip.employerPf,
          employerEsi: slip.employerEsi,
          expenseId: exp.id,
          createdAt: payDay,
        },
      });
      salaryNo += 1;
      await db.staffInvoice.create({
        data: {
          number: `SAL-${payDay.getFullYear()}-${String(salaryNo).padStart(4, "0")}`,
          staffId: t.id,
          kind: "salary",
          month: key,
          payslipId: ps.id,
          expenseId: exp.id,
          amount: slip.net,
          description: `Salary for ${label}: gross ${slip.gross}, deductions ${slip.deductions}`,
          issuedAt: payDay,
        },
      });
    }
    const due = statutoryDue(slips);
    const statDue = new Date(mEnd.getTime() + 14 * day + 12 * 3600 * 1000);
    await db.expense.create({
      data: {
        category: "statutory",
        description: `PF, ESI and PT ${label}`,
        vendor: "EPFO / ESIC / Punjab PT",
        amount: due.total,
        dueDate: statDue,
        ...(statDue < now ? { paidAt: statDue, method: "bank" } : {}),
      },
    });
  }

  const ramesh = staffNamed("Ramesh Kumar");
  const advance = await db.expense.create({
    data: {
      category: "salary",
      description: `Salary advance · ${ramesh.name}`,
      vendor: ramesh.name,
      amount: 3000,
      dueDate: at(-6, 12),
      paidAt: at(-6, 15),
      method: "cash",
    },
  });
  salaryNo += 1;
  await db.staffInvoice.create({
    data: {
      number: `SAL-${now.getFullYear()}-${String(salaryNo).padStart(4, "0")}`,
      staffId: ramesh.id,
      kind: "advance",
      expenseId: advance.id,
      amount: 3000,
      description: "Salary advance: Advance for school fees",
      issuedAt: at(-6, 12),
    },
  });
  await db.staffQuery.createMany({
    data: [
      {
        staffId: ramesh.id,
        topic: "advance",
        subject: "Advance for school fees",
        message: "Need ₹3,000 for my daughter’s school fees. Please cut it from this month’s salary.",
        amount: 3000,
        status: "approved",
        reply: "Approved. Collect it in cash from the desk; it comes off this month’s salary.",
        repliedById: owner.id,
        repliedAt: at(-6, 12),
        expenseId: advance.id,
        createdAt: at(-7, 9),
      },
      {
        staffId: staffNamed("Imran Qureshi").id,
        topic: "claim",
        subject: "Cones and bibs for junior camp",
        message: "Bought 20 cones and 16 bibs from Sports Hub for Sunday’s under-14 camp. The bill is with the desk.",
        amount: 1850,
        createdAt: at(-1, 18),
      },
      {
        staffId: staffNamed("Pooja Rani").id,
        topic: "pay",
        subject: "ESI number on payslip",
        message: "My payslip shows ESI deducted but I don’t have my ESI card number yet. Who do I ask?",
        createdAt: at(-2, 11),
      },
      {
        staffId: staffNamed("Baldev Singh").id,
        topic: "schedule",
        subject: "Swap to nights next week",
        message: "Can I swap with Mohan and do nights from Monday? Family is travelling.",
        status: "answered",
        reply: "Fine if Mohan agrees. Update the roster at the desk.",
        repliedById: owner.id,
        repliedAt: at(-3, 17),
        createdAt: at(-4, 8),
      },
      {
        staffId: staffNamed("Vikram Sood").id,
        topic: "leave",
        subject: "Leave days left this year",
        message: "How many paid leave days do I have left? Planning a trip in December.",
        createdAt: at(0, 10),
      },
    ],
  });

  await db.leaveRequest.createMany({
    data: [
      { staffId: bar.id, from: at(3, 0), to: at(4, 0), reason: "Family function", status: "pending" },
      { staffId: desk.id, from: at(-10, 0), to: at(-10, 0), reason: "Medical appointment", status: "approved", decidedById: owner.id, decidedAt: at(-12, 10) },
    ],
  });

  await db.lead.createMany({
    data: [
      {
        name: "Karan Arora",
        phone: "9811000001",
        interest: "trial",
        message: "Can I try a tennis session this weekend?",
        preferredAt: at(2, 18),
        status: "new",
      },
      {
        name: "Simran Dhillon",
        phone: "9811000002",
        email: "simran@example.com",
        interest: "membership",
        message: "Family membership for two adults and a kid",
        status: "contacted",
        createdAt: at(-2, 12),
      },
      {
        name: "Tech Park Pvt Ltd",
        phone: "9811000003",
        interest: "membership",
        message: "Corporate plan for 20 employees",
        status: "quoted",
        quoteAmount: 45000,
        createdAt: at(-5, 11),
      },
      { name: "Rahul Khanna", phone: "9811000004", interest: "trial", preferredAt: at(1, 7), status: "new", createdAt: at(0, 9) },
      { name: "Nidhi Saxena", phone: "9811000005", interest: "membership", status: "won", createdAt: at(-9, 15) },
    ],
  });

  console.log(
    `Seeded: ${team.length} staff (${owner.email}, ${desk.email}, ${bar.email}), ${members.length} members, ${courts.length} courts, ${products.length} products, ${menu.length} menu items.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
