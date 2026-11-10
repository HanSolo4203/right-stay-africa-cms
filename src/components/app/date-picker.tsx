'use client';

import * as React from 'react';
import {
  addDays,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import { enZA } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  showPresets?: boolean;
};

const PRESETS = [
  { label: 'Today', get: () => new Date() },
  { label: 'Tomorrow', get: () => addDays(new Date(), 1) },
  {
    label: 'This week',
    get: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  },
  {
    label: 'Next 7 days',
    get: () => addDays(new Date(), 7),
  },
];

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  showPresets = true,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const label = value
    ? format(value, 'EEE, d MMM', { locale: enZA })
    : placeholder;

  const content = (
    <div className="space-y-3">
      {showPresets ? (
        <div className="flex flex-wrap gap-2 px-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9"
              onClick={() => {
                onChange(preset.get());
                setOpen(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}
      <Calendar
        mode="single"
        selected={value}
        onSelect={(date) => {
          onChange(date);
          setOpen(false);
        }}
        weekStartsOn={1}
        locale={enZA}
      />
    </div>
  );

  const trigger = (
    <Button
      variant="outline"
      className={cn('min-h-11 justify-start gap-2 font-normal', className)}
      aria-label="Choose date"
    >
      <CalendarIcon className="size-[18px]" strokeWidth={1.75} />
      <span className="font-mono tabular-nums">{label}</span>
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="safe-pb">
          <DrawerHeader>
            <DrawerTitle>Select date</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

type DateRange = { from?: Date; to?: Date };

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
};

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const label =
    value?.from && value?.to
      ? `${format(value.from, 'd MMM', { locale: enZA })} – ${format(value.to, 'd MMM', { locale: enZA })}`
      : value?.from
        ? format(value.from, 'EEE, d MMM', { locale: enZA })
        : 'Date range';

  const presets = [
    { label: 'Today', range: { from: new Date(), to: new Date() } },
    {
      label: 'This week',
      range: {
        from: startOfWeek(new Date(), { weekStartsOn: 1 }),
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      },
    },
    {
      label: 'Next 7 days',
      range: { from: new Date(), to: addDays(new Date(), 6) },
    },
  ];

  const content = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 px-1">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={() => {
              onChange(preset.range);
              setOpen(false);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <Calendar
        mode="range"
        selected={value?.from ? { from: value.from, to: value.to } : undefined}
        onSelect={(range) => onChange(range)}
        weekStartsOn={1}
        locale={enZA}
        numberOfMonths={isDesktop ? 2 : 1}
      />
    </div>
  );

  const trigger = (
    <Button
      variant="outline"
      className={cn('min-h-11 justify-start gap-2 font-normal', className)}
      aria-label="Choose date range"
    >
      <CalendarIcon className="size-[18px]" strokeWidth={1.75} />
      <span className="font-mono tabular-nums">{label}</span>
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="safe-pb">
          <DrawerHeader>
            <DrawerTitle>Select date range</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
