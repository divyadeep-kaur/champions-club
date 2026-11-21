// Photos for the cafe menu, matched by item name. Items without one show a plain tile.
const photos: Record<string, string> = {
  "Masala Chai": "masala-chai",
  "Fresh Lime Soda": "fresh-lime-soda",
  "Electrolyte Cooler": "electrolyte-cooler",
  "Cold Coffee": "cold-coffee",
  "Craft Beer (pint)": "craft-beer",
  "Protein Bowl": "protein-bowl",
  "Chicken Club Sandwich": "chicken-club-sandwich",
  "Paneer Tikka Wrap": "paneer-tikka-wrap",
  "Veg Hakka Noodles": "veg-hakka-noodles",
  "French Fries": "french-fries",
};

export function menuPhoto(name: string) {
  const slug = photos[name];
  return slug ? `/images/menu/${slug}.jpg` : null;
}
