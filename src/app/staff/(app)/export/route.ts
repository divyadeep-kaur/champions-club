import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isoDate } from "@/lib/dates";
import { asPeriod, METHOD_LABEL, periodRange, SOURCE_LABEL } from "@/lib/reports";
import { getSession } from "@/lib/session";

const cell = (v: string | number) => {
  const s = String(v);
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "owner") return new NextResponse("Not allowed", { status: 403 });

  const period = asPeriod(new URL(req.url).searchParams.get("period") ?? undefined);
  const { from, to } = periodRange(period);
  const payments = await db.payment.findMany({ where: { createdAt: { gte: from, lt: to } }, orderBy: { createdAt: "asc" } });

  const rows = [
    ["Date", "Time", "Source", "Method", "Amount (INR)", "Note"],
    ...payments.map((p) => [
      isoDate(p.createdAt),
      p.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
      SOURCE_LABEL[p.source] ?? p.source,
      METHOD_LABEL[p.method] ?? p.method,
      p.amount,
      p.note ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map(cell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="champions-club-income-${period}-${isoDate(new Date())}.csv"`,
    },
  });
}
