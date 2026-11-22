"use client";

import { useActionState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmSubmit } from "@/components/staff/ConfirmSubmit";
import { SPORTS } from "@/lib/constants";
import { addCourt, deleteCourt, updateCourt, type CourtState } from "./actions";

const input = "min-h-10 w-full border border-[#b5aa98] bg-white px-2.5 text-[14.5px] outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";
const lbl = "grid gap-1 text-[12.5px] font-semibold text-muted";

function Status({ state }: { state: CourtState }) {
  return (
    <p role="status" aria-live="polite" className={`text-[13.5px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

function Fields({ court }: { court?: { name: string; sport: string; walkInRate: number } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <label className={lbl}>
        Court name
        <input name="name" required minLength={2} maxLength={40} defaultValue={court?.name} placeholder="Tennis Court 5" className={input} />
      </label>
      <label className={lbl}>
        Sport
        <select name="sport" defaultValue={court?.sport ?? "tennis"} className={`${input} capitalize`}>
          {SPORTS.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className={lbl}>
        Walk-in rate (₹/hr)
        <input name="walkInRate" type="number" min={0} step={50} required defaultValue={court?.walkInRate ?? 800} className={input} />
      </label>
    </div>
  );
}

export function AddCourtForm() {
  const [state, action, pending] = useActionState<CourtState, FormData>(addCourt, {});
  return (
    <form action={action} className="grid gap-3">
      <Fields />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center gap-2 bg-forest px-4 text-[14px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
        >
          <Plus className="size-4" /> Add court
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function EditCourtForm({ court, bookingCount }: { court: { id: number; name: string; sport: string; walkInRate: number }; bookingCount: number }) {
  const [state, action, pending] = useActionState<CourtState, FormData>(updateCourt, {});
  const [delState, delAction, deleting] = useActionState<CourtState, FormData>(deleteCourt, {});
  return (
    <div className="grid gap-3">
      <form key={court.id} action={action} className="grid gap-3">
        <input type="hidden" name="courtId" value={court.id} />
        <Fields court={court} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-10 items-center gap-2 bg-forest px-4 text-[14px] font-semibold text-cream hover:bg-forest-deep disabled:opacity-70"
          >
            Save changes
          </button>
          <Status state={state} />
        </div>
      </form>
      <form action={delAction} className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <input type="hidden" name="courtId" value={court.id} />
        <ConfirmSubmit
          pending={deleting}
          confirmLabel={`Click again to delete ${court.name}`}
          className="inline-flex min-h-10 items-center gap-2 border border-clay/50 px-3.5 text-[14px] font-semibold text-clay hover:bg-clay-soft disabled:opacity-70"
        >
          <Trash2 className="size-4" /> Delete court
        </ConfirmSubmit>
        <p className="text-[13px] text-muted">
          {bookingCount > 0 ? `${bookingCount} booking${bookingCount === 1 ? "" : "s"} on record. Courts with history can't be deleted.` : "No bookings yet, so it can be deleted."}
        </p>
        <Status state={delState} />
      </form>
    </div>
  );
}
