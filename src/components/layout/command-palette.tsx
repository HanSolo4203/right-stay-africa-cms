'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { navGroups } from '@/lib/nav';

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const run = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {navGroups.map((group, index) => (
          <React.Fragment key={group.title}>
            {index > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={group.title}>
              {group.items.map((item) => (
                <CommandItem
                  key={`${group.title}-${item.href}`}
                  value={`${item.title} ${item.href}`}
                  onSelect={() => run(item.href)}
                >
                  <item.icon className="size-4" strokeWidth={1.75} />
                  {item.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
