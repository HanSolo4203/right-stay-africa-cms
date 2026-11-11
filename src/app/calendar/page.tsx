'use client';

import { useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import { MultiCalendar } from '@/components/calendar/MultiCalendar';
import CalendarView from '@/components/ui/CalendarView';
import { UplistingSyncStatus } from '@/components/uplisting/UplistingSyncStatus';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaQuery } from '@/hooks/use-media-query';
type CalendarMode = 'timeline' | 'month' | 'agenda';

function CalendarPageContent() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  // Always open on the timeline calendar by default.
  const [mode, setMode] = useState<CalendarMode>('timeline');

  return (
    <div className="mx-auto flex min-h-[70dvh] min-w-0 max-w-[1600px] flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as CalendarMode)}
        >
          <TabsList className="h-11 w-full justify-start overflow-x-auto md:w-auto">
            {isMobile ? (
              <TabsTrigger value="agenda" className="min-h-9">
                Agenda
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="timeline" className="min-h-9">
              Timeline
            </TabsTrigger>
            <TabsTrigger value="month" className="min-h-9">
              Month
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <UplistingSyncStatus compact className="sm:max-w-md sm:ml-auto" />
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-card">
        {mode === 'timeline' ? (
          <MultiCalendar />
        ) : (
          <div className="p-3 md:p-4">
            <CalendarView />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Calendar() {
  return (
    <AuthWrapper>
      <CalendarPageContent />
    </AuthWrapper>
  );
}
