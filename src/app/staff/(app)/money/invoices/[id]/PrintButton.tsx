"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="min-h-11 border-[1.5px] border-forest px-4 font-semibold text-forest hover:bg-forest/5">
      Print or save as PDF
    </button>
  );
}
