# Team task board

Read this before starting anything. Pull first: `git pull --rebase origin main`.

## How we use it

1. Pick a task. If it is in someone else's area, ask them first.
2. Claim it before writing code: add a line under **In progress** with your name, the task and the files you expect to touch. Commit only this file (`claim: <task>`) and push straight away.
3. If a line under **In progress** already covers it or touches the same files, do not start. Pick something else or talk to the owner.
4. When the work is pushed, move your line to **Done** in the same commit as the work.
5. Shared files (`prisma/schema.prisma`, `prisma/seed.ts`, `src/lib/nav.ts`, `src/app/globals.css`, layouts): keep changes small and push them on their own, right away. If you change the schema, say so in the commit message so the other person runs `npm run db:push`.

## Areas

| Area | Owner | Main files |
|---|---|---|
| Income, bills, payroll, GST, invoices, staff invoices | Jashan | `src/app/staff/(app)/money`, `src/lib/money.ts`, `src/lib/payroll.ts`, `src/lib/ledger.ts` |
| Team, staff IDs, My pay, staff queries, leave | Jashan | `src/app/staff/(app)/team`, `me`, `queries`, `leave`, `payslip`, `salary-invoice` |
| Court bookings, social play, court payments | Jashan | `src/app/staff/(app)/bookings`, `src/lib/bookingService.ts`, `src/lib/socialService.ts` |
| Member app (book, café orders, shop orders) | Jashan | `src/app/me` |
| Roles, sign-in, permissions | Jashan | `src/lib/session.ts`, `src/lib/nav.ts`, `src/middleware.ts`, `src/app/staff/login` |
| Member management, plans, renewals, membership history | Divyadeep | `src/app/staff/(app)/members`, `src/lib/membership.ts`, `src/lib/membershipService.ts` |
| Shop, inventory, delivery, product photos | Divyadeep | `src/app/staff/(app)/shop`, `src/lib/inventory.ts`, `src/lib/delivery.ts` |
| Café menu, bar, kitchen | Divyadeep | `src/app/staff/(app)/bar`, `kitchen`, `src/lib/tabs.ts` |
| Leads and free trials | Divyadeep | `src/app/staff/(app)/leads`, `src/app/trial`, `src/lib/leads.ts` |
| Landing page, public pages, animations | Divyadeep | `src/components/landing`, `src/app/page.tsx`, `src/app/courts`, `src/components/ScrollReveal.tsx` |

## In progress

- Jashan: step-by-step member court booking: sport, court, then time (`src/app/me/(app)/book`)

## Next up

- (add ideas here; claim them before starting)

## Done

- Member app menu moved to a left olive sidebar on desktop, phones keep bottom tabs (Divyadeep)
- Kitchen: cooking stage, prep list, today's numbers, sold out switches, café team on shift (Divyadeep)
- Trial form: plan picker for membership, Other option removed (Divyadeep)
- Member app desktop layout and photo café menu (Jashan)
- Finance audit: collect unpaid courts, double-payment guards, refunds by original method, exact invoice GST (Jashan)
- Member management extras: close a plan, Payments due tab (Jashan)
- Shop inventory, delivery, product and café item editing (Divyadeep)
