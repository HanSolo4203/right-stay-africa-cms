'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
        className="sticky top-0 z-30 bg-background/90 backdrop-blur"
        style={{ paddingTop: 'var(--safe-top)' }}
      >
        <div className="flex min-h-14 items-center gap-3 page-pad py-3 lg:min-h-[4.5rem]">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center lg:hidden"
            aria-label="Right Stay home"
          >
            <Image
              src="/logo.png"
              alt="Right Stay Africa"
              width={96}
              height={32}
              className="h-8 w-auto"
              priority
            />
          </Link>

          <div className="min-w-0 shrink-0 lg:w-40">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
              {title}
            </h1>
          </div>

          <div className="hidden flex-1 items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-[50px] w-full max-w-[440px] items-center gap-2 rounded-[10px] bg-[#f9fafa] px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted dark:bg-muted"
            >
              <Search className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">Looking for...</span>
              <kbd className="ml-auto hidden rounded-md border border-border/70 bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground lg:inline">
                ⌘K
              </kbd>
            </button>

            {onDateChange ? (
              <DatePicker
                value={date}
                onChange={onDateChange}
                showPresets
                className="min-h-[50px]"
              />
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="size-[50px] shrink-0 rounded-[10px] bg-[#eff5f5] text-foreground hover:bg-muted dark:bg-muted"
              aria-label="Booking updates"
              asChild
            >
              <Link href="/updates">
                <Bell className="size-[18px]" strokeWidth={1.75} />
              </Link>
            </Button>
            {actions}
          </div>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <div className="flex items-center gap-1 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-[10px] bg-muted/80"
                aria-label="Search"
                onClick={() => setCommandOpen(true)}
              >
                <Search className="size-[18px]" strokeWidth={1.75} />
              </Button>
              {onRefresh ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 rounded-[10px] bg-muted/80"
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
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
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
        </div>
      </header>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
