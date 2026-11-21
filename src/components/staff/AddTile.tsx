"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

// A "+" tile at the end of a product or menu grid. It opens the add form in a dialog,
// so new stock can be added without leaving the counter.
export function AddTile({ label, title, children }: { label: string; title: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  const close = () => {
    setOpen(false);
    setRound((r) => r + 1);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        className="grid min-h-[150px] w-full place-items-center content-center gap-2 border-2 border-dashed border-forest/40 bg-paper p-4 text-forest transition-colors hover:border-forest hover:bg-forest/5"
      >
        <span className="grid size-12 place-items-center rounded-full bg-forest text-cream">
          <Plus className="size-6" aria-hidden="true" />
        </span>
        <span className="text-[14.5px] font-semibold">{label}</span>
      </button>
      <dialog
        ref={ref}
        onClose={close}
        aria-label={title}
        className="m-auto w-[min(640px,calc(100vw-24px))] border border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-forest-deep/50"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-[19px] font-semibold">{title}</h2>
          <button type="button" onClick={close} aria-label="Close" className="grid size-9 place-items-center text-muted hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        <div key={round} className="max-h-[78vh] overflow-y-auto">
          {open && children(close)}
        </div>
      </dialog>
    </>
  );
}
