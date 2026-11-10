'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { AppTopbar } from '@/components/layout/app-topbar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const bare =
    pathname === '/login' || pathname.startsWith('/cleaning/live');

  if (bare) {
    return <>{children}</>;
  }

  const showFab =
    pathname.startsWith('/cleaning') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/calendar');

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-svh bg-background">
        <AppTopbar />
        <div className={cn('page-pad flex-1 py-4 md:py-6', 'pb-mobile-nav md:pb-8')}>
          {children}
        </div>
        {showFab ? (
          <Button
            asChild
            size="icon"
            className="fixed right-4 z-40 size-14 rounded-full shadow-xs md:hidden"
            style={{ bottom: 'calc(4.75rem + var(--safe-bottom))' }}
            aria-label="New job"
          >
            <Link href="/cleaning?new=1">
              <Plus className="size-6" strokeWidth={1.75} />
            </Link>
          </Button>
        ) : null}
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
