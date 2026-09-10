import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  NotebookPen,
  CalendarCheck,
  FileDown,
  Building2,
  BarChart3,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only shown to head teachers and master admins. */
  leadershipOnly?: boolean;
  /** Only shown to master admin. */
  adminOnly?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: Users },
  { href: "/grades", label: "Grades", icon: NotebookPen },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/reports", label: "Reports", icon: FileDown },
  { href: "/school", label: "School Admin", icon: Building2, leadershipOnly: true },
  { href: "/admin", label: "Organization", icon: BarChart3, adminOnly: true },
];
