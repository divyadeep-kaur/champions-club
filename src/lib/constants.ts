export const ROLES = ["owner", "desk", "bar", "shop", "coach", "staff"] as const;
export type Role = (typeof ROLES)[number];

export const SPORTS = ["tennis", "cricket"] as const;
export const BOOKING_TYPES = ["regular", "social", "trial"] as const;
export const BOOKING_STATUS = ["booked", "cancelled"] as const;

export const ORDER_CHANNELS = ["counter", "online"] as const;
export const FULFILMENT = ["counter", "pickup", "delivery"] as const;
export const ORDER_STATUS = ["pending", "ready", "completed", "cancelled"] as const;

export const TAB_STATUS = ["open", "paid", "void"] as const;
export const LEAD_STATUS = ["new", "contacted", "trial", "quoted", "won", "lost"] as const;
export const LEAD_INTEREST = ["trial", "membership", "other"] as const;

export const PAYMENT_SOURCES = ["membership", "court", "shop", "bar"] as const;
export const PAYMENT_METHODS = ["cash", "card", "upi", "online"] as const;

export const OPEN_HOUR = 6;
export const CLOSE_HOUR = 23;
export const SLOT_MINUTES = 30;
export const SESSION_MINUTES = 60;
export const MAX_BOOKINGS_PER_DAY = 2;

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
