// How shop orders reach the member: delivered to them inside the club, or to their home.
// "pickup" (collect at the front desk) is kept so older orders still read correctly.
export const FULFILMENT_LABEL: Record<string, string> = {
  club: "Delivered in the club",
  delivery: "Home delivery",
  pickup: "Collect at front desk",
  counter: "Counter sale",
};

// Places inside the club where staff can bring an order, besides the courts.
export const CLUB_SPOTS = ["Front desk", "Café", "Changing rooms", "Viewing gallery"];

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// Indian PIN codes are six digits and never start with 0.
export const isPincode = (pin: string) => /^[1-9]\d{5}$/.test(pin.trim());

// Shipping is set by the owner. Orders at or above the free-delivery amount ship free.
export type ShippingRule = { fee: number; freeOver: number };
export const DEFAULT_SHIPPING: ShippingRule = { fee: 99, freeOver: 1999 };
export const SHIPPING_FEE_KEY = "shop.shippingFee";
export const FREE_OVER_KEY = "shop.freeDeliveryOver";

export function shippingFor(fulfilment: string, goodsTotal: number, rule: ShippingRule) {
  if (fulfilment !== "delivery") return 0;
  if (rule.freeOver > 0 && goodsTotal >= rule.freeOver) return 0;
  return rule.fee;
}

export type HomeAddress = { line1: string; line2: string; landmark?: string; city: string; state: string; pincode: string };

export const formatAddress = (a: HomeAddress) =>
  [a.line1, a.line2, a.landmark ? `Near ${a.landmark}` : "", `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(", ");
