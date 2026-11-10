'use client';

import { useState } from 'react';
import { ChevronDown, Filter, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PropertyWithBookings } from '@/lib/queries/bookings';
import { getPropertyDisplayName, type DatePreset, ZOOM_LEVELS } from './calendar-utils';

interface CalendarToolbarProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  showAvailableOnly: boolean;
  onShowAvailableOnlyChange: (value: boolean) => void;
  showOccupancy: boolean;
  onShowOccupancyChange: (value: boolean) => void;
  datePreset: DatePreset;
  onDatePresetChange: (value: DatePreset) => void;
  selectedPropertyId: string;
  onSelectedPropertyIdChange: (value: string) => void;
  showCancelled: boolean;
  onShowCancelledChange: (value: boolean) => void;
  apartments: PropertyWithBookings[];
  isPhone: boolean;
  zoomIndex: number;
  isZooming: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoomLabelRef: React.RefObject<HTMLSpanElement | null>;
  summaryText?: string;
}

export function CalendarToolbar({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  showAvailableOnly,
  onShowAvailableOnlyChange,
  showOccupancy,
  onShowOccupancyChange,
  datePreset,
  onDatePresetChange,
  selectedPropertyId,
  onSelectedPropertyIdChange,
  showCancelled,
  onShowCancelledChange,
  apartments,
  isPhone,
  zoomIndex,
  isZooming,
  onZoomIn,
  onZoomOut,
  zoomLabelRef,
  summaryText,
}: CalendarToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  const filterControls = (
    <div className="space-y-4 p-1 min-w-[220px]">
      <div className="space-y-2">
        <DropdownMenuLabel className="px-0">Property</DropdownMenuLabel>
        <Select value={selectedPropertyId} onValueChange={onSelectedPropertyIdChange}>
          <SelectTrigger className="w-full bg-white border-gray-300">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {apartments.map((apt) => (
              <SelectItem key={apt.id} value={apt.id}>
                {getPropertyDisplayName(apt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="show-cancelled" className="text-sm text-gray-700 cursor-pointer">
          Show cancelled
        </Label>
        <Switch
          id="show-cancelled"
          checked={showCancelled}
          onCheckedChange={onShowCancelledChange}
        />
      </div>
      {isPhone && (
        <>
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="show-available-phone" className="text-sm text-gray-700">
              Available only
            </Label>
            <Switch
              id="show-available-phone"
              checked={showAvailableOnly}
              onCheckedChange={onShowAvailableOnlyChange}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="show-occupancy-phone" className="text-sm text-gray-700">
              Show occupancy
            </Label>
            <Switch
              id="show-occupancy-phone"
              checked={showOccupancy}
              onCheckedChange={onShowOccupancyChange}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-gray-700">Date preset</Label>
            <Select
              value={datePreset}
              onValueChange={(v) => onDatePresetChange(v as DatePreset)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom dates</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="next_30">Next 30 days</SelectItem>
                <SelectItem value="next_90">Next 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
      <div className="flex flex-col sm:flex-row sm:flex-wrap lg:justify-end gap-3 items-stretch sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="cal-start-date" className="text-xs text-gray-500">
            Start Date
          </Label>
          <Input
            id="cal-start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="h-10 w-full sm:w-[150px] bg-white"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cal-end-date" className="text-xs text-gray-500">
            End Date
          </Label>
          <Input
            id="cal-end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="h-10 w-full sm:w-[150px] bg-white"
          />
        </div>

        {!isPhone && (
          <>
            <div className="flex items-center gap-2 h-10 pb-0.5">
              <Switch
                id="show-available"
                checked={showAvailableOnly}
                onCheckedChange={onShowAvailableOnlyChange}
              />
              <Label htmlFor="show-available" className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                Show Available Listings only
              </Label>
            </div>
            <div className="flex items-center gap-2 h-10 pb-0.5">
              <Switch
                id="show-occupancy"
                checked={showOccupancy}
                onCheckedChange={onShowOccupancyChange}
              />
              <Label htmlFor="show-occupancy" className="text-sm text-gray-700 cursor-pointer whitespace-nowrap">
                Show Occupancy
              </Label>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Dates</Label>
              <Select
                value={datePreset}
                onValueChange={(v) => onDatePresetChange(v as DatePreset)}
              >
                <SelectTrigger className="h-10 w-[160px] bg-white uppercase text-xs tracking-wide">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom dates</SelectItem>
                  <SelectItem value="this_month">This month</SelectItem>
                  <SelectItem value="next_30">Next 30 days</SelectItem>
                  <SelectItem value="next_90">Next 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <DropdownMenu open={filterOpen} onOpenChange={setFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 gap-1.5">
              <Filter className="w-4 h-4" />
              Filter
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="p-3">
            {filterControls}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center rounded-md border border-gray-200 bg-white h-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomOut}
            disabled={zoomIndex === 0 || isZooming}
            aria-label="Zoom out"
            className="h-10 w-10 text-gray-600"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span
            ref={zoomLabelRef}
            className="text-xs text-gray-500 tabular-nums min-w-[3rem] text-center"
          >
            {Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onZoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1 || isZooming}
            aria-label="Zoom in"
            className="h-10 w-10 text-gray-600"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
      </div>
      {summaryText && (
        <p className="text-xs text-gray-500 sm:text-right">{summaryText}</p>
      )}
    </div>
  );
}
