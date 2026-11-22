"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { btnOutline, btnPrimary, fieldCls } from "@/components/staff/ui";
import { addCourt, blockSlot, deleteCourt, updateCourt, type CourtState } from "./actions";

const label = "grid gap-1 text-[13px] font-semibold text-muted";

function Note({ state }: { state: CourtState }) {
  if (!state.error && !state.ok) return null;
  return (
    <p key={state.at} role={state.error ? "alert" : "status"} className={`text-[14px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

export function AddCourtForm() {
  const [state, action, pending] = useActionState<CourtState, FormData>(addCourt, {});
  return (
    <form action={action} className="grid gap-3 border border-line bg-paper p-4">
      <h2 className="text-[17px] font-bold text-forest">Add a court</h2>
      <label className={label}>
        Name
        <input name="name" placeholder="Tennis Court 5" className={fieldCls} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Sport
          <select name="sport" className={fieldCls} defaultValue="tennis">
            <option value="tennis">Tennis</option>
            <option value="cricket">Cricket</option>
          </select>
        </label>
        <label className={label}>
          Walk-in ₹ / hour
          <input name="walkInRate" type="number" min={100} step={50} defaultValue={800} className={fieldCls} />
        </label>
      </div>
      <Note state={state} />
      <button disabled={pending} className={btnPrimary}>
        {pending && <Loader2 className="size-4 animate-spin" />} Add court
      </button>
    </form>
  );
}

export function EditCourtForm({ court }: { court: { id: number; name: string; walkInRate: number } }) {
  const [state, action, pending] = useActionState<CourtState, FormData>(updateCourt, {});
  const [del, delAction, deleting] = useActionState<CourtState, FormData>(deleteCourt, {});
  return (
    <div className="grid gap-3 border border-line bg-paper p-4">
      <h2 className="text-[17px] font-bold text-forest">Edit {court.name}</h2>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="courtId" value={court.id} />
        <label className={label}>
          Name
          <input name="name" defaultValue={court.name} className={fieldCls} />
        </label>
        <label className={label}>
          Walk-in ₹ / hour
          <input name="walkInRate" type="number" min={100} step={50} defaultValue={court.walkInRate} className={fieldCls} />
        </label>
        <Note state={state} />
        <button disabled={pending} className={btnPrimary}>
          {pending && <Loader2 className="size-4 animate-spin" />} Save changes
        </button>
      </form>
      <form action={delAction} className="grid gap-2 border-t border-line pt-3">
        <input type="hidden" name="courtId" value={court.id} />
        <Note state={del} />
        <button disabled={deleting} className={`${btnOutline} border-clay text-clay`}>
          Delete court
        </button>
        <p className="text-[12.5px] text-muted">Only courts that were never booked can be deleted, so no booking or payment history is lost.</p>
      </form>
    </div>
  );
}

export function BlockForm({ courtId, date, times }: { courtId: number; date: string; times: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<CourtState, FormData>(blockSlot, {});
  return (
    <form action={action} className="grid gap-3 border border-line bg-paper p-4">
      <h2 className="text-[17px] font-bold text-forest">Block a slot</h2>
      <p className="text-[13px] text-muted">For repairs, coaching or events. Blocked time shows as taken everywhere and costs nothing.</p>
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="date" value={date} />
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Start
          <select name="time" className={fieldCls} defaultValue="">
            <option value="" disabled>
              {times.length ? "Pick a time" : "No free time"}
            </option>
            {times.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Length
          <select name="minutes" className={fieldCls} defaultValue="60">
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
            <option value="90">1½ hours</option>
            <option value="120">2 hours</option>
          </select>
        </label>
      </div>
      <label className={label}>
        Reason
        <input name="reason" placeholder="Net repair" maxLength={60} className={fieldCls} />
      </label>
      <Note state={state} />
      <button disabled={pending || !times.length} className={btnPrimary}>
        {pending && <Loader2 className="size-4 animate-spin" />} Block time
      </button>
    </form>
  );
}
