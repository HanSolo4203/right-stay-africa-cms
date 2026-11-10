'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildMonthOptions,
  formatMonthLabel,
  getCurrentMonthKey,
  shiftMonthKey,
} from '@/lib/cleaning-month';

interface CleaningMonthPickerProps {
  value: string;
  onChange: (monthKey: string) => void;
  id?: string;
}

export function CleaningMonthPicker({
  value,
  onChange,
  id = 'cleaning-month',
}: CleaningMonthPickerProps) {
  const options = useMemo(() => buildMonthOptions(1, 2), []);
  const [currentMonthKey, setCurrentMonthKey] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMonthKey(getCurrentMonthKey());
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Month</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(shiftMonthKey(value, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="min-w-[160px]">
            <SelectValue placeholder={formatMonthLabel(value)} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
                {currentMonthKey && opt.value === currentMonthKey ? ' (Current)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onChange(shiftMonthKey(value, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
