import { inr } from "@/lib/constants";
import { collectCourtPayment } from "./actions";

export function CollectForm({ bookingId, playerId, amount, compact }: { bookingId?: number; playerId?: number; amount: number; compact?: boolean }) {
  const id = bookingId ? `b${bookingId}` : `p${playerId}`;
  return (
    <form action={collectCourtPayment} className="flex flex-wrap items-center gap-1.5">
      {bookingId && <input type="hidden" name="bookingId" value={bookingId} />}
      {playerId && <input type="hidden" name="playerId" value={playerId} />}
      <label className="sr-only" htmlFor={`pay-${id}`}>
        Paid by
      </label>
      <select id={`pay-${id}`} name="method" defaultValue="upi" className="min-h-9 border border-[#b5aa98] bg-white px-1.5 text-[13.5px]">
        <option value="upi">UPI</option>
        <option value="card">Card</option>
        <option value="cash">Cash</option>
      </select>
      <button type="submit" className="min-h-9 bg-forest px-3 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-deep">
        {compact ? "Collect" : `Collect ${inr(amount)}`}
      </button>
    </form>
  );
}
