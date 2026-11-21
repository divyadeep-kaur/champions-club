"use client";

import { useActionState, useState } from "react";
import { ArrowRightLeft, UserRound, XCircle } from "lucide-react";
import { ConfirmSubmit } from "@/components/staff/ConfirmSubmit";
import { changeTabPerson, moveTab, voidTab, type TabState } from "./actions";

const input = "min-h-10 min-w-0 flex-1 border border-[#b5aa98] bg-white px-3 text-[14.5px] outline-none focus:border-forest";
const ghost = "min-h-10 border-[1.5px] border-forest px-3 text-[14px] font-semibold text-forest hover:bg-forest/5 disabled:opacity-60";

function Note({ state }: { state: TabState }) {
  if (!state.error && !state.ok) return null;
  return (
    <p role={state.error ? "alert" : "status"} className={`text-[13.5px] font-semibold ${state.error ? "text-clay" : "text-[#4d7a12]"}`}>
      {state.error ?? state.ok}
    </p>
  );
}

// Change who the tab belongs to, move it to another table, or clear the table without charging.
export function TabTools({
  tabId,
  where,
  hasMember,
  guestName,
  madeItems,
  isOwner,
  freeTables,
  onTable,
}: {
  tabId: number;
  where: string;
  hasMember: boolean;
  guestName: string | null;
  madeItems: number;
  isOwner: boolean;
  freeTables: { id: number; label: string }[];
  onTable: boolean;
}) {
  const [personState, personAction, personPending] = useActionState<TabState, FormData>(changeTabPerson, {});
  const [moveState, moveAction, movePending] = useActionState<TabState, FormData>(moveTab, {});
  const [voidState, voidAction, voidPending] = useActionState<TabState, FormData>(voidTab, {});
  const [who, setWho] = useState<"member" | "guest">(hasMember ? "guest" : "member");
  const blocked = madeItems > 0 && !isOwner;

  return (
    <details className="group border border-line bg-cream/60 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-[14.5px] font-semibold text-forest">
        Change person, move or clear table
        <span aria-hidden="true" className="transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="grid gap-4 border-t border-line px-3 py-3.5">
        <form action={personAction} className="grid gap-2" aria-label="Change the person on this tab">
          <input type="hidden" name="tabId" value={tabId} />
          <input type="hidden" name="who" value={who} />
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <UserRound className="size-4" aria-hidden="true" /> Who is this tab for?
          </span>
          <div role="radiogroup" aria-label="Who is this tab for" className="grid grid-cols-2 border-[1.5px] border-forest">
            {(
              [
                ["member", "A member"],
                ["guest", "Walk-in guest"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={who === v}
                onClick={() => setWho(v)}
                className={`min-h-10 text-[14px] font-semibold ${who === v ? "bg-forest text-cream" : "text-forest hover:bg-forest/5"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {who === "member" ? (
              <input
                key="member"
                name="member"
                list="bar-members"
                placeholder="Member code or phone"
                aria-label="Member code or phone"
                autoComplete="off"
                className={input}
              />
            ) : (
              <input
                key="guest"
                name="guestName"
                defaultValue={guestName && guestName !== "Guest" ? guestName : ""}
                placeholder="Guest name (optional)"
                aria-label="Guest name"
                maxLength={60}
                className={input}
              />
            )}
            <button type="submit" disabled={personPending} className={ghost}>
              {personPending ? "Saving…" : "Change"}
            </button>
          </div>
          <Note state={personState} />
        </form>

        <form action={moveAction} className="grid gap-2" aria-label="Move this tab">
          <input type="hidden" name="tabId" value={tabId} />
          <label htmlFor={`move-${tabId}`} className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <ArrowRightLeft className="size-4" aria-hidden="true" /> Move from {where} to
          </label>
          <div className="flex gap-2">
            <select id={`move-${tabId}`} name="tableId" defaultValue="" className={input}>
              <option value="" disabled>
                {freeTables.length || onTable ? "Pick a free table" : "No free tables"}
              </option>
              {freeTables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              {onTable && <option value="counter">Counter</option>}
            </select>
            <button type="submit" disabled={movePending} className={ghost}>
              {movePending ? "Moving…" : "Move"}
            </button>
          </div>
          <Note state={moveState} />
        </form>

        <form action={voidAction} className="grid gap-2 border-t border-dashed border-line pt-3.5" aria-label="Clear this table">
          <input type="hidden" name="tabId" value={tabId} />
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold">
            <XCircle className="size-4" aria-hidden="true" /> Clear {where} without charging
          </span>
          <p className="text-[13px] text-muted">
            {madeItems > 0
              ? `${madeItems} item${madeItems > 1 ? "s are" : " is"} already being made or served. ${isOwner ? "Clearing writes them off." : "Only the owner can clear this tab."}`
              : "Use this when guests leave before anything is made. Their order is cancelled and the table is free again."}
          </p>
          <ConfirmSubmit
            pending={voidPending}
            disabled={blocked}
            confirmLabel="Click again to clear, nothing charged"
            className="inline-flex min-h-10 items-center justify-center gap-2 border-[1.5px] border-clay px-3 text-[14px] font-semibold text-clay hover:bg-clay/5 disabled:opacity-50"
          >
            Clear table
          </ConfirmSubmit>
          <Note state={voidState} />
        </form>
      </div>
    </details>
  );
}
