# champions-club

Sports club management system for The Champions Club: tennis and cricket courts, memberships, a gear shop, and a café & bar.

Built for the Odoo x LPU hackathon (24 hours).

## What it does

Staff log in and run the club from one place. Members don't need accounts. Payments are only recorded (cash, card or UPI), there is no real payment gateway.

| Module | What's in it | Status |
| --- | --- | --- |
| Core | Database schema, seed data, layout, staff login | in progress |
| Members | Gold / Silver / Junior plans with their own court rates and shop & bar discounts, sign-up, automatic expiry, quick search with history | todo |
| Bookings | 1-hour sessions starting every 30 min, no double booking, max 2 bookings per member per day, member vs walk-in price, cancel, Friday social play on a shared court | todo |
| Shop | Products and stock, low-stock alert, counter sale and online order (pickup or delivery) from the same stock | todo |
| Café & bar | Tables and tabs, member discount applied automatically, cash/card/UPI, shifts, the day's earnings | todo |
| Website + leads | Public pages (plans, this week's free slots, shop, trial booking) and an enquiry -> follow-up -> quote -> member pipeline | landing page started |
| Dashboard | Revenue today / this week / this month by source and payment method, CSV export | todo |

Later, if there's time: payroll, leave, taxes, invoices for business clients.

## Demo flow

1. A walk-in signs up as a Silver member.
2. They book a 6 pm court. A double booking and a 3rd booking that day are both refused.
3. They buy a racket at the member price and the stock goes down.
4. They run a bar tab, the member discount is applied automatically, and they pay by UPI.
5. The owner's dashboard shows income from courts, shop and bar.

## Stack

Next.js, TypeScript, Tailwind CSS, Prisma, SQLite.

## Run locally

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open http://localhost:3000. Staff app: http://localhost:3000/staff (demo logins are in `prisma/seed.ts`).

`npm run db:reset` wipes the local database and reseeds it. Stop `npm run dev` before running `npm run build`.
