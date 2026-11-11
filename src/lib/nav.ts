import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Link2,
  Package,
  Receipt,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  mobileTab?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const primaryMobileTabs: NavItem[] = [
  { title: 'Today', href: '/dashboard', icon: BarChart3, mobileTab: true },
  { title: 'Calendar', href: '/calendar', icon: Calendar, mobileTab: true },
  { title: 'Jobs', href: '/cleaning', icon: Sparkles, mobileTab: true },
  { title: 'Properties', href: '/properties', icon: Building2, mobileTab: true },
];

/** Compact icon rail for desktop (Dashboard chat menu style). */
export const railNavItems: NavItem[] = [
  { title: 'Today', href: '/dashboard', icon: BarChart3 },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
  { title: 'Jobs', href: '/cleaning', icon: Sparkles },
  { title: 'Properties', href: '/properties', icon: Building2 },
  { title: 'Bookings', href: '/bookings', icon: BookOpen },
  { title: 'Updates', href: '/updates', icon: Activity },
  { title: 'Settings', href: '/settings', icon: Settings },
];

export const navGroups: NavGroup[] = [
  {
    title: 'Operations',
    items: [
      { title: 'Today', href: '/dashboard', icon: BarChart3 },
      { title: 'Calendar', href: '/calendar', icon: Calendar },
      { title: 'Jobs', href: '/cleaning', icon: Sparkles },
      { title: 'Properties', href: '/properties', icon: Building2 },
      { title: 'Bookings', href: '/bookings', icon: BookOpen },
      { title: 'Updates', href: '/updates', icon: Activity },
      { title: 'Team', href: '/settings/cleaners', icon: Users },
    ],
  },
  {
    title: 'Business',
    items: [
      { title: 'Inventory', href: '/inventory', icon: Package },
      { title: 'Reports', href: '/reports/monthly-expenses', icon: FileText },
      { title: 'Owner Statements', href: '/finance/owner-statements', icon: DollarSign },
      { title: 'Invoicing', href: '/finance/invoicing', icon: Receipt },
      { title: 'Analytics', href: '/finance/analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'Settings',
    items: [
      { title: 'General', href: '/settings', icon: Settings },
      { title: 'Uplisting', href: '/settings/uplisting', icon: Link2 },
      { title: 'Cleaner Payouts', href: '/settings/cleaners', icon: DollarSign },
    ],
  },
];

export const moreMenuItems: NavItem[] = [
  { title: 'Bookings', href: '/bookings', icon: BookOpen },
  { title: 'Updates', href: '/updates', icon: Activity },
  { title: 'Team', href: '/settings/cleaners', icon: Users },
  { title: 'Inventory', href: '/inventory', icon: Package },
  { title: 'Reports', href: '/reports/monthly-expenses', icon: FileText },
  { title: 'Owner Statements', href: '/finance/owner-statements', icon: DollarSign },
  { title: 'Invoicing', href: '/finance/invoicing', icon: Receipt },
  { title: 'Analytics', href: '/finance/analytics', icon: TrendingUp },
  { title: 'Settings', href: '/settings', icon: Settings },
  { title: 'Uplisting', href: '/settings/uplisting', icon: Link2 },
];

export function isNavActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  if (href === '/settings') return pathname === '/settings';
  return pathname === href || pathname.startsWith(`${href}/`);
}
