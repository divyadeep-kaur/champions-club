"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductPhoto } from "@/lib/productPhotos";

// Product photo with optional colour swatches. Tapping a swatch swaps the photo.
export function ProductImage({
  photo,
  name,
  className = "",
  sizes = "200px",
  swatches = true,
}: {
  photo: ProductPhoto;
  name: string;
  className?: string;
  sizes?: string;
  swatches?: boolean;
}) {
  const [shown, setShown] = useState(photo.colours?.[0] ?? { label: "", src: photo.src });

  return (
    <div className={className}>
      <div className="relative aspect-square overflow-hidden bg-white">
        <Image
          key={shown.src}
          src={shown.src}
          alt={shown.label ? `${name} in ${shown.label.toLowerCase()}` : name}
          fill
          unoptimized
          sizes={sizes}
          className={`${photo.fit === "contain" ? "object-contain" : "object-cover"} transition-transform duration-500 hover:scale-105`}
        />
      </div>
      {swatches && photo.colours && (
        <div className="mt-2 flex items-center gap-1.5" role="group" aria-label={`${name} colours`}>
          {photo.colours.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => setShown(c)}
              aria-pressed={shown.src === c.src}
              aria-label={c.label}
              title={c.label}
              className={`relative size-8 overflow-hidden rounded-full border-2 bg-white ${shown.src === c.src ? "border-forest" : "border-line hover:border-forest/50"}`}
            >
              <Image src={c.src} alt="" fill unoptimized sizes="32px" className="object-cover object-[50%_35%]" />
            </button>
          ))}
          <span className="ml-1 text-[12.5px] text-muted">{shown.label}</span>
        </div>
      )}
    </div>
  );
}
