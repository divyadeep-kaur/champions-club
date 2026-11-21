// Photos for shop products, matched by SKU. Products without one show a plain tile.
export type ProductPhoto = { src: string; fit: "contain" | "cover"; colours?: { label: string; src: string }[] };

const photos: Record<string, ProductPhoto> = {
  "RKT-001": { src: "/images/shop-rackets.jpg", fit: "cover" },
  "RKT-002": { src: "/images/products/junior-racket.jpg", fit: "contain" },
  "BAL-001": { src: "/images/products/tennis-balls.jpg", fit: "contain" },
  "BAL-002": { src: "/images/products/cricket-ball.jpg", fit: "contain" },
  "SHO-002": { src: "/images/products/court-shoes.jpg", fit: "contain" },
  "APP-001": {
    src: "/images/products/polo-navy.jpg",
    fit: "contain",
    colours: [
      { label: "Navy", src: "/images/products/polo-navy.jpg" },
      { label: "White", src: "/images/products/polo-white.jpg" },
      { label: "Black", src: "/images/products/polo-black.jpg" },
    ],
  },
};

export const productPhoto = (sku: string): ProductPhoto | null => photos[sku] ?? null;
