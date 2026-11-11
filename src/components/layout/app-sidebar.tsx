'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { isNavActive, moreMenuItems, railNavItems } from '@/lib/nav';
import { cn } from '@/lib/utils';

function RailButton({
  href,
  title,
  active,
  children,
}: {
  href: string;
  title: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={title}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex size-12 items-center justify-center rounded-[14px] transition-colors',
            active
              ? 'bg-white/15 text-white'
              : 'text-[color:var(--sidebar-muted)] hover:bg-white/10 hover:text-white'
          )}
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {title}
      </TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();

  return (
    <aside
      className="pointer-events-none fixed inset-y-0 left-0 z-40 hidden w-[calc(var(--rail-width)+var(--rail-gap)+0.75rem)] p-4 pr-0 lg:block"
      aria-label="Primary"
    >
      <div className="pointer-events-auto flex h-full w-[var(--rail-width)] flex-col items-center rounded-[30px] bg-sidebar px-3 py-5 text-sidebar-foreground shadow-[var(--shadow-panel)]">
        <Link
          href="/dashboard"
          className="mb-6 flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white/10"
          aria-label="Right Stay home"
        >
          <Image
            src="/logo.png"
            alt="Right Stay Africa"
            width={36}
            height={36}
            className="size-8 object-contain"
            priority
          />
        </Link>

        <nav className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto no-scrollbar">
          {railNavItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <RailButton
                key={item.href}
                href={item.href}
                title={item.title}
                active={active}
              >
                <Icon className="size-5" strokeWidth={1.75} />
              </RailButton>
            );
          })}

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="More"
                    className={cn(
                      'flex size-12 items-center justify-center rounded-[14px] transition-colors',
                      'text-[color:var(--sidebar-muted)] hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <MoreHorizontal className="size-5" strokeWidth={1.75} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                More
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>Business</DropdownMenuLabel>
              {moreMenuItems
                .filter(
                  (item) =>
                    !railNavItems.some((rail) => rail.href === item.href)
                )
                .map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>
                      <item.icon className="size-4" strokeWidth={1.75} />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="mt-4 flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => signOut()}
                aria-label="Log out"
                className="flex size-12 items-center justify-center rounded-[14px] text-[color:var(--sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-5" strokeWidth={1.75} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12}>
              Log out
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </aside>
  );
}
