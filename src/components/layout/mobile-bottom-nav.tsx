'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { isNavActive, moreMenuItems, primaryMobileTabs } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  if (pathname === '/login' || pathname.startsWith('/cleaning/live')) {
    return null;
  }

  const moreActive = moreMenuItems.some((item) => isNavActive(pathname, item.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
        aria-label="Primary"
      >
        <ul className="grid h-16 grid-cols-5">
          {primaryMobileTabs.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon
                    className="size-[18px]"
                    strokeWidth={1.75}
                    fill={active ? 'currentColor' : 'none'}
                    aria-hidden
                  />
                  {item.title}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex h-full min-h-11 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
                moreActive ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-label="More navigation"
            >
              <MoreHorizontal
                className="size-[18px]"
                strokeWidth={1.75}
                fill={moreActive ? 'currentColor' : 'none'}
              />
              More
            </button>
          </li>
        </ul>
      </nav>

      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="safe-pb">
          <DrawerHeader>
            <DrawerTitle>More</DrawerTitle>
          </DrawerHeader>
          <ul className="grid gap-1 px-2 pb-4">
            {moreMenuItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex min-h-12 items-center gap-3 rounded-[10px] px-3 text-sm font-medium',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  );
}
