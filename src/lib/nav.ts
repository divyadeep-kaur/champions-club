import type { Role } from "./constants";

export const staffNav: { href: string; label: string; icon: string; roles: Role[] }[] = [
  { href: "/staff", label: "Dashboard", icon: "dashboard", roles: ["owner", "desk", "bar"] },
  { href: "/staff/members", label: "Members", icon: "members", roles: ["owner", "desk"] },
  { href: "/staff/bookings", label: "Bookings", icon: "bookings", roles: ["owner", "desk"] },
  { href: "/staff/shop", label: "Shop", icon: "shop", roles: ["owner", "desk"] },
  { href: "/staff/bar", label: "Café & Bar", icon: "bar", roles: ["owner", "bar"] },
  { href: "/staff/leads", label: "Leads", icon: "leads", roles: ["owner", "desk"] },
];

export const navFor = (role: Role) => staffNav.filter((item) => item.roles.includes(role));
