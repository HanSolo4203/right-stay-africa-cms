'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { isNavActive, navGroups } from '@/lib/nav';

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="hidden border-r border-sidebar-border lg:flex">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden px-1">
          <Image
            src="/logo.png"
            alt="Right Stay Africa"
            width={120}
            height={40}
            className="h-8 w-auto"
            priority
          />
          <span className="truncate text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Right Stay
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={`${group.title}-${item.href}`}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <item.icon className="size-[18px]" strokeWidth={1.75} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
        ops.rightstayafrica.com
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
