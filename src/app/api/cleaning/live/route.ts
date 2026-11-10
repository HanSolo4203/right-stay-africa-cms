import { NextRequest, NextResponse } from 'next/server';
import {
  LIVE_SCHEDULE_SPILLOVER_DAYS,
  formatMonthLabel,
  getCurrentMonthKey,
  getLiveScheduleRange,
  parseMonthKey,
} from '@/lib/cleaning-month';
import { isValidCleaningLiveToken } from '@/lib/cleaning-live-token';
import {
  getCleaningTasksWithDetails,
  getPropertyDisplayName,
} from '@/lib/queries/cleaning';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!isValidCleaningLiveToken(token)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing link' }, { status: 401 });
    }

    const monthParam = request.nextUrl.searchParams.get('month');
    const monthKey =
      monthParam && parseMonthKey(monthParam) ? monthParam : getCurrentMonthKey();
    const range = getLiveScheduleRange(monthKey);

    const supabase = createServiceRoleClient();
    const tasks = await getCleaningTasksWithDetails(supabase, {
      fromDate: range.start,
      toDate: range.end,
      status: 'all',
      taskType: 'all',
    });

    const publicTasks = tasks.map((task) => ({
      id: task.id,
      scheduled_date: task.scheduled_date,
      task_type: task.task_type,
      status: task.status,
      property_name: getPropertyDisplayName(task),
      apartment_name: task.apartment_name,
      uplisting_name: task.uplisting_name,
      guest_name: task.guest_name,
      nights: task.nights,
      cleaner_name: task.cleaner_name,
      booking_reference: task.booking_reference,
      notes: task.notes,
      is_spillover: task.scheduled_date > range.monthEnd,
    }));

    return NextResponse.json({
      success: true,
      data: {
        month: monthKey,
        month_label: formatMonthLabel(monthKey),
        from_date: range.start,
        to_date: range.end,
        month_end: range.monthEnd,
        spillover_days: LIVE_SCHEDULE_SPILLOVER_DAYS,
        generated_at: new Date().toISOString(),
        tasks: publicTasks,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load live schedule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
