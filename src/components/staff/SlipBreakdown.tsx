import { inr } from "@/lib/constants";

type SlipLike = {
  gross: number;
  basic: number;
  hra: number;
  allowance: number;
  pf: number;
  esi: number;
  pt: number;
  advance: number;
  net: number;
  employerPf: number;
  employerEsi: number;
};

function Line({ label, value, strong, minus }: { label: string; value: number; strong?: boolean; minus?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 border-t border-line py-2 text-[14.5px] ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">
        {minus && value ? "− " : ""}
        {inr(value)}
      </span>
    </div>
  );
}

export function SlipBreakdown({ slip, employer = true }: { slip: SlipLike; employer?: boolean }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <h3 className="mb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Earnings</h3>
        <Line label="Gross pay" value={slip.gross} strong />
      </div>
      <div>
        <h3 className="mb-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Deductions</h3>
        <Line label="Provident fund" value={slip.pf} minus />
        <Line label="ESI (0.75%)" value={slip.esi} minus />
        <Line label="Professional tax" value={slip.pt} minus />
        {slip.advance > 0 && <Line label="Advance recovered" value={slip.advance} minus />}
        <div className="mt-1 flex justify-between gap-3 bg-forest px-3 py-2.5 text-cream">
          <span className="font-semibold">Take-home pay</span>
          <span className="font-serif text-[20px] tabular-nums">{inr(slip.net)}</span>
        </div>
      </div>
      {employer && (
        <p className="text-[13.5px] text-muted sm:col-span-2">
          The club also pays {inr(slip.employerPf)} PF and {inr(slip.employerEsi)} ESI on top, so the full cost is{" "}
          <strong className="text-ink tabular-nums">{inr(slip.gross + slip.employerPf + slip.employerEsi)}</strong> a month.
        </p>
      )}
    </div>
  );
}
