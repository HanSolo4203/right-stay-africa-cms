import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildTasksForBooking,
  normalizeMidstaySettings,
  planMidstayNights,
} from '@/lib/cleaning-schedule';

const defaults = normalizeMidstaySettings(5, 7, 8, 1);

describe('planMidstayNights', () => {
  const cases: Array<{ nights: number; offsets: number[] }> = [
    { nights: 5, offsets: [] },
    { nights: 6, offsets: [3] },
    { nights: 7, offsets: [4] },
    { nights: 8, offsets: [4] },
    { nights: 10, offsets: [5] },
    { nights: 14, offsets: [7] },
    { nights: 16, offsets: [8] },
    { nights: 17, offsets: [6, 11] },
    { nights: 21, offsets: [7, 14] },
    { nights: 24, offsets: [8, 16] },
    { nights: 28, offsets: [7, 14, 21] },
    { nights: 30, offsets: [8, 15, 23] },
  ];

  it.each(cases)(
    '$nights nights → $offsets.length mid-stays at $offsets',
    ({ nights, offsets }) => {
      expect(planMidstayNights(nights, defaults)).toEqual(offsets);
    }
  );

  it('never places on check-in, checkout, or night before checkout', () => {
    for (let nights = 1; nights <= 40; nights++) {
      const offsets = planMidstayNights(nights, defaults);
      for (const offset of offsets) {
        expect(offset).toBeGreaterThanOrEqual(1);
        expect(offset).toBeLessThanOrEqual(nights - 2);
        expect(offset).not.toBe(0);
        expect(offset).not.toBe(nights);
        expect(offset).not.toBe(nights - 1);
      }
      expect(new Set(offsets).size).toBe(offsets.length);
    }
  });
});

describe('buildTasksForBooking', () => {
  it('always includes checkout on check_out_date with matching ideal_date', () => {
    const tasks = buildTasksForBooking(
      { check_in_date: '2026-01-01', check_out_date: '2026-01-08' },
      defaults
    );

    expect(tasks[0]).toEqual({
      task_type: 'checkout_clean',
      scheduled_date: '2026-01-08',
      ideal_date: '2026-01-08',
    });
  });

  it('places mid-stays at planned offsets with ideal_date = scheduled_date', () => {
    const checkIn = '2026-03-01';
    const tasks = buildTasksForBooking(
      { check_in_date: checkIn, check_out_date: '2026-03-18' },
      defaults
    );

    const midStays = tasks.filter((t) => t.task_type === 'midstay_clean');
    expect(midStays.map((t) => t.scheduled_date)).toEqual([
      addDays(checkIn, 6),
      addDays(checkIn, 11),
    ]);
    for (const task of midStays) {
      expect(task.ideal_date).toBe(task.scheduled_date);
    }
  });
});
