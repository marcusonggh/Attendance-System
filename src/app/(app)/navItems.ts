import {
  ClipboardCheck,
  Users,
  CalendarClock,
  Receipt,
  LayoutDashboard,
} from "lucide-react";

export const navItems = [
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/students", label: "Students", icon: Users },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
