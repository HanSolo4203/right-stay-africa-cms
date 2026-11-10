'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  Sun,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { DatePicker } from '@/components/app/date-picker';
import { CommandPalette } from '@/components/layout/command-palette';
import { primaryMobileTabs, moreMenuItems } from '@/lib/nav';

function titleFromPath(pathname: string) {
  const all = [...primaryMobileTabs, ...moreMenuItems];
  const match = all.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return match?.title ?? 'Right Stay';
}

type AppTopbarProps = {
  onRefresh?: () => void;
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  actions?: React.ReactNode;
};

export function AppTopbar({
  onRefresh,
  date,
  onDateChange,
  actions,
}: AppTopbarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const title = titleFromPath(pathname);

  return (
    <>
      <header
        className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex min-h-14 items-center gap-2 page-pad py-2 lg:min-h-16">
          <div className="hidden lg:block">
            <SidebarTrigger className="size-11" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">
              {title}
            </h1>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {onDateChange ? (
              <DatePicker
                value={date}
                onChange={onDateChange}
                showPresets
                className="min-h-10"
              />
            ) : null}
            <Button
              variant="outline"
              size="icon"
              className="size-11"
              aria-label="Search"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-[18px]" strokeWidth={1.75} />
            </Button>
            <kbd className="pointer-events-none hidden rounded-md border border-border bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground lg:inline">
              ⌘K
            </kbd>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Booking updates"
              asChild
            >
              <Link href="/updates">
                <Bell className="size-[18px]" strokeWidth={1.75} />
              </Link>
            </Button>
            {actions}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label="Search"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="size-[18px]" strokeWidth={1.75} />
            </Button>
            {onRefresh ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label="Refresh"
                onClick={onRefresh}
              >
                <RefreshCw className="size-[18px]" strokeWidth={1.75} />
              </Button>
            ) : null}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full"
                aria-label="Account menu"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="size-4" strokeWidth={1.75} />
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {user?.email ?? 'Account'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="size-4" strokeWidth={1.75} />
                ) : (
                  <Moon className="size-4" strokeWidth={1.75} />
                )}
                Toggle theme
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="size-4" strokeWidth={1.75} />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
