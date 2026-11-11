import type { CleaningDayCapacity } from '@/lib/types';

export function minutesToHoursLabel(minutes: number): string {
  const hours = minutes / 60;
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function capacityUtilization(day: Pick<CleaningDayCapacity, 'booked_minutes' | 'capacity_minutes'>): number {
  if (day.capacity_minutes <= 0) {
    return day.booked_minutes > 0 ? 2 : 0;
  }
  return day.booked_minutes / day.capacity_minutes;
}

export type CapacityTone = 'green' | 'amber' | 'red' | 'neutral';

export function capacityTone(day: Pick<CleaningDayCapacity, 'booked_minutes' | 'capacity_minutes'>): CapacityTone {
  if (day.booked_minutes <= 0) return 'neutral';
  const util = capacityUtilization(day);
  if (util > 1) return 'red';
  if (util >= 0.8) return 'amber';
  return 'green';
}

export function capacityBadgeClasses(tone: CapacityTone): string {
  switch (tone) {
    case 'green':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'amber':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    case 'red':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function formatBookedCapacity(day: Pick<CleaningDayCapacity, 'booked_minutes' | 'capacity_minutes'>): string {
  return `${minutesToHoursLabel(day.booked_minutes)} / ${minutesToHoursLabel(day.capacity_minutes)} h`;
}

export function overflowHoursLabel(overflowMinutes: number): string {
  return `+${minutesToHoursLabel(overflowMinutes)} h`;
}
