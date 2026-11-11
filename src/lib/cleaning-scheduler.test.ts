import { describe, expect, it } from 'vitest';
import { addDays } from '@/lib/cleaning-schedule';
import {
  isTaskFixed,
  midstayCandidateDates,
  normalizeDurationDefaults,
  resolveTaskDurationMinutes,
  scheduleCleaningCapacity,
  type SchedulerApartment,
  type SchedulerCleaner,
  type SchedulerTaskInput,
} from '@/lib/cleaning-scheduler';

const durations = normalizeDurationDefaults();

function cleaner(
  id: string,
  opts?: Partial<SchedulerCleaner>
): SchedulerCleaner {
  return {
    id,
    name: id,
    daily_capacity_minutes: 450,
    is_on_call: false,
    is_active: true,
    ...opts,
  };
}

function apt(
  id: string,
  size: SchedulerApartment['size_type'] = '1_bed'
): SchedulerApartment {
  return {
    id,
    size_type: size,
    checkout_minutes: null,
    midstay_minutes: null,
  };
}

function task(
  partial: Partial<SchedulerTaskInput> &
    Pick<SchedulerTaskInput, 'id' | 'apartment_id' | 'task_type' | 'scheduled_date'>
): SchedulerTaskInput {
  return {
    ideal_date: partial.ideal_date ?? partial.scheduled_date,
    status: 'pending',
    is_locked: false,
    assigned_cleaner_id: null,
    duration_minutes: null,
    ...partial,
  };
}

describe('resolveTaskDurationMinutes', () => {
  it('uses size_type defaults', () => {
    expect(
      resolveTaskDurationMinutes('checkout_clean', apt('a', '1_bed'), durations)
    ).toBe(150);
    expect(
      resolveTaskDurationMinutes('midstay_clean', apt('a', '1_bed'), durations)
    ).toBe(90);
    expect(
      resolveTaskDurationMinutes('checkout_clean', apt('a', '2_bed_luxury'), durations)
    ).toBe(180);
    expect(
      resolveTaskDurationMinutes('midstay_clean', apt('a', '2_bed_luxury'), durations)
    ).toBe(120);
  });

  it('prefers apartment minute overrides', () => {
    expect(
      resolveTaskDurationMinutes(
        'checkout_clean',
        { size_type: '1_bed', checkout_minutes: 200, midstay_minutes: null },
        durations
      )
    ).toBe(200);
  });
});

describe('midstayCandidateDates', () => {
  it('excludes check-in, checkout, day before checkout, and blocked weekdays', () => {
    // ideal Friday 2026-03-06; flex 1 → Thu/Fri/Sat
    // checkout Sun 2026-03-08 → exclude Sat (day before) and Sun
    const dates = midstayCandidateDates({
      idealDate: '2026-03-06',
      flexDays: 1,
      checkInDate: '2026-02-20',
      checkOutDate: '2026-03-08',
      blockedWeekdays: [0], // Sunday
    });
    expect(dates).toEqual(['2026-03-06', '2026-03-05']);
  });
});

describe('isTaskFixed', () => {
  it('treats checkouts, locked, and completed as fixed', () => {
    expect(
      isTaskFixed({ task_type: 'checkout_clean', is_locked: false, status: 'pending' })
    ).toBe(true);
    expect(
      isTaskFixed({ task_type: 'midstay_clean', is_locked: true, status: 'pending' })
    ).toBe(true);
    expect(
      isTaskFixed({
        task_type: 'midstay_clean',
        is_locked: false,
        status: 'completed',
      })
    ).toBe(true);
    expect(
      isTaskFixed({ task_type: 'midstay_clean', is_locked: false, status: 'pending' })
    ).toBe(false);
  });
});

describe('scheduleCleaningCapacity', () => {
  const cleaners = [
    cleaner('c1'),
    cleaner('c2'),
    cleaner('c3'),
    cleaner('oncall', { is_on_call: true }),
  ];

  it('Busy Friday: moves mid-stays when adjacent days have free capacity', () => {
    // Friday 2026-03-06. Capacity 3*450=1350.
    // 6×1-bed checkout (900) + 2×2-bed checkout (360) = 1260 fixed.
    // 3×1-bed mid-stay (270) → total 1530 if all stay Friday → overflow 180.
    const friday = '2026-03-06';
    const thursday = '2026-03-05';
    const saturday = '2026-03-07';

    const apartments = [
      ...Array.from({ length: 6 }, (_, i) => apt(`one-${i}`, '1_bed')),
      ...Array.from({ length: 2 }, (_, i) => apt(`two-${i}`, '2_bed_luxury')),
      ...Array.from({ length: 3 }, (_, i) => apt(`mid-${i}`, '1_bed')),
    ];

    const tasks: SchedulerTaskInput[] = [
      ...apartments.slice(0, 6).map((a, i) =>
        task({
          id: `co1-${i}`,
          apartment_id: a.id,
          task_type: 'checkout_clean',
          scheduled_date: friday,
          assigned_cleaner_id: cleaners[i % 3].id,
          duration_minutes: 150,
        })
      ),
      ...apartments.slice(6, 8).map((a, i) =>
        task({
          id: `co2-${i}`,
          apartment_id: a.id,
          task_type: 'checkout_clean',
          scheduled_date: friday,
          assigned_cleaner_id: cleaners[i % 3].id,
          duration_minutes: 180,
        })
      ),
      ...apartments.slice(8).map((a, i) =>
        task({
          id: `ms-${i}`,
          apartment_id: a.id,
          task_type: 'midstay_clean',
          scheduled_date: friday,
          ideal_date: friday,
          duration_minutes: 90,
          check_in_date: '2026-02-20',
          check_out_date: '2026-03-20',
        })
      ),
    ];

    const result = scheduleCleaningCapacity({
      tasks,
      cleaners,
      apartments,
      primaryByApartment: Object.fromEntries(
        apartments.map((a, i) => [a.id, cleaners[i % 3].id])
      ),
      settings: {
        flexDays: 1,
        blockedWeekdays: [],
        autoUseOnCall: false,
        durations,
      },
    });

    const fridaySummary = result.days.find((d) => d.date === friday)!;
    const midStays = result.tasks.filter((t) => t.task_type === 'midstay_clean');
    const moved = midStays.filter((t) => t.scheduled_date !== friday);

    // 1260 fixed leaves 90 free → one mid-stay can stay; the other two move.
    expect(moved).toHaveLength(2);
    expect(midStays.filter((t) => t.scheduled_date === friday)).toHaveLength(1);
    for (const t of moved) {
      expect([thursday, saturday]).toContain(t.scheduled_date);
    }
    expect(fridaySummary.booked_minutes).toBe(1350);
    expect(fridaySummary.overloaded).toBe(false);

    // If adjacent days are also full, Friday is flagged with overflow 180.
    const filler = (date: string, prefix: string): SchedulerTaskInput[] =>
      Array.from({ length: 9 }, (_, i) =>
        task({
          id: `${prefix}-${i}`,
          apartment_id: apartments[0].id,
          task_type: 'checkout_clean',
          scheduled_date: date,
          assigned_cleaner_id: cleaners[i % 3].id,
          duration_minutes: 150, // 9*150=1350 fills the day
        })
      );

    const blockedAdj = scheduleCleaningCapacity({
      tasks: [...tasks, ...filler(thursday, 'thu'), ...filler(saturday, 'sat')],
      cleaners,
      apartments,
      primaryByApartment: Object.fromEntries(
        apartments.map((a, i) => [a.id, cleaners[i % 3].id])
      ),
      settings: {
        flexDays: 1,
        blockedWeekdays: [],
        autoUseOnCall: false,
        durations,
      },
    });

    const fridayBlocked = blockedAdj.days.find((d) => d.date === friday)!;
    expect(fridayBlocked.booked_minutes).toBe(1530);
    expect(fridayBlocked.capacity_minutes).toBe(1350);
    expect(fridayBlocked.overflow_minutes).toBe(180);
    expect(fridayBlocked.overloaded).toBe(true);
  });

  it('falls back to least-loaded regular cleaner when primary is full', () => {
    const date = '2026-04-10';
    const apartments = [apt('a1'), apt('a2')];
    const tasks: SchedulerTaskInput[] = [
      task({
        id: 't1',
        apartment_id: 'a1',
        task_type: 'checkout_clean',
        scheduled_date: date,
        assigned_cleaner_id: 'c1',
        duration_minutes: 450,
      }),
      task({
        id: 't2',
        apartment_id: 'a2',
        task_type: 'checkout_clean',
        scheduled_date: date,
        duration_minutes: 150,
      }),
    ];

    const result = scheduleCleaningCapacity({
      tasks,
      cleaners,
      apartments,
      primaryByApartment: { a1: 'c1', a2: 'c1' },
      settings: {
        flexDays: 1,
        blockedWeekdays: [],
        autoUseOnCall: false,
        durations,
      },
    });

    const second = result.tasks.find((t) => t.id === 't2')!;
    expect(second.assigned_cleaner_id).not.toBe('c1');
    expect(second.assigned_cleaner_id).not.toBe('oncall');
    expect(['c2', 'c3']).toContain(second.assigned_cleaner_id);
  });

  it('never moves locked mid-stay tasks', () => {
    const ideal = '2026-05-08';
    const apartments = [apt('a1'), ...Array.from({ length: 9 }, (_, i) => apt(`x${i}`))];
    const tasks: SchedulerTaskInput[] = [
      task({
        id: 'locked-ms',
        apartment_id: 'a1',
        task_type: 'midstay_clean',
        scheduled_date: ideal,
        ideal_date: ideal,
        is_locked: true,
        assigned_cleaner_id: 'c1',
        duration_minutes: 90,
        check_in_date: addDays(ideal, -10),
        check_out_date: addDays(ideal, 10),
      }),
      // Fill the ideal day so unlocked mid-stays would want to leave.
      ...apartments.slice(1).map((a, i) =>
        task({
          id: `fill-${i}`,
          apartment_id: a.id,
          task_type: 'checkout_clean',
          scheduled_date: ideal,
          assigned_cleaner_id: cleaners[i % 3].id,
          duration_minutes: 150,
        })
      ),
    ];

    const result = scheduleCleaningCapacity({
      tasks,
      cleaners,
      apartments,
      primaryByApartment: { a1: 'c1' },
      settings: {
        flexDays: 1,
        blockedWeekdays: [],
        autoUseOnCall: false,
        durations,
      },
    });

    const locked = result.tasks.find((t) => t.id === 'locked-ms')!;
    expect(locked.scheduled_date).toBe(ideal);
    expect(locked.assigned_cleaner_id).toBe('c1');
    expect(locked.moved).toBe(false);
  });

  it('does not auto-assign on-call unless auto_use_on_call is true', () => {
    const date = '2026-06-01';
    // One regular with no remaining capacity; only on-call free.
    const tightCleaners = [
      cleaner('c1', { daily_capacity_minutes: 100 }),
      cleaner('oncall', { is_on_call: true }),
    ];
    const apartments = [apt('a1')];
    const tasks = [
      task({
        id: 't1',
        apartment_id: 'a1',
        task_type: 'checkout_clean',
        scheduled_date: date,
        duration_minutes: 150,
      }),
    ];

    const without = scheduleCleaningCapacity({
      tasks,
      cleaners: tightCleaners,
      apartments,
      primaryByApartment: { a1: 'c1' },
      settings: {
        flexDays: 0,
        blockedWeekdays: [],
        autoUseOnCall: false,
        durations,
      },
    });
    expect(without.tasks[0].assigned_cleaner_id).toBeNull();
    expect(without.days[0].overloaded).toBe(true);

    const withOnCall = scheduleCleaningCapacity({
      tasks,
      cleaners: tightCleaners,
      apartments,
      primaryByApartment: { a1: 'c1' },
      settings: {
        flexDays: 0,
        blockedWeekdays: [],
        autoUseOnCall: true,
        durations,
      },
    });
    expect(withOnCall.tasks[0].assigned_cleaner_id).toBe('oncall');
  });
});
