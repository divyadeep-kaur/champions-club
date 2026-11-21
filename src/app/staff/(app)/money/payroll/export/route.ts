import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { deptLabel } from "@/lib/payroll";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "owner") return new NextResponse("Not allowed", { status: 403 });
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) return new NextResponse("Bad month", { status: 400 });
  const slips = await db.payslip.findMany({ where: { month }, include: { staff: true }, orderBy: { staff: { code: "asc" } } });
  const head = ["Staff ID", "Name", "Job", "Department", "Gross", "PF", "ESI", "PT", "Advance", "Net", "Employer PF", "Employer ESI", "Leave days"];
  const rows = slips.map((p) =>
    [
      p.staff.code ?? "",
      p.staff.name,
      p.staff.jobTitle,
      deptLabel(p.staff.department),
      p.gross,
      p.pf,
      p.esi,
      p.pt,
      p.advance,
      p.net,
      p.employerPf,
      p.employerEsi,
      p.leaveDays,
    ]
      .map(cell)
      .join(","),
  );
  return new NextResponse([head.join(","), ...rows].join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="payroll-${month}.csv"` },
  });
}
