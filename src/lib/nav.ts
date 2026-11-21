import type { Role } from "./constants";

export const staffNav: { href: string; label: string; icon: string; roles: Role[] }[] = [
  { href: "/staff", label: "Dashboard", icon: "dashboard", roles: ["owner", "desk", "bar"] },
  { href: "/staff/members", label: "Members", icon: "members", roles: ["owner", "desk"] },
  { href: "/staff/bookings", label: "Bookings", icon: "bookings", roles: ["owner", "desk"] },
  { href: "/staff/shop", label: "Shop", icon: "shop", roles: ["owner", "desk", "shop"] },
  { href: "/staff/bar", label: "Café & Bar", icon: "bar", roles: ["owner", "bar"] },
  { href: "/staff/kitchen", label: "Kitchen", icon: "kitchen", roles: ["owner", "bar"] },
  { href: "/staff/leads", label: "Leads", icon: "leads", roles: ["owner", "desk"] },
  { href: "/staff/money", label: "Money", icon: "money", roles: ["owner"] },
  { href: "/staff/team", label: "Team", icon: "team", roles: ["owner"] },
  { href: "/staff/me", label: "My pay", icon: "pay", roles: ["desk", "bar", "shop", "coach", "staff"] },
  { href: "/staff/queries", label: "Queries", icon: "queries", roles: ["owner", "desk", "bar", "shop", "coach", "staff"] },
  { href: "/staff/leave", label: "Leave", icon: "leave", roles: ["owner", "desk", "bar", "shop", "coach", "staff"] },
];

export const navFor = (role: Role) => staffNav.filter((item) => item.roles.includes(role));

export const ROLE_LABEL: Record<string, string> = { owner: "Owner", desk: "Reception", bar: "Café & bar", shop: "Pro shop", coach: "Coach", staff: "Support staff" };
export const homeFor = (role: string) => (role === "shop" ? "/staff/shop" : role === "coach" || role === "staff" ? "/staff/me" : "/staff");
