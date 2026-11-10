'use client';

import { useEffect, useState } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import { MultiCalendar } from '@/components/calendar/MultiCalendar';
import CalendarView from '@/components/ui/CalendarView';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

type CalendarMode = 'timeline' | 'month' | 'agenda';

const STORAGE_KEY = 'calendar:pageView';

function CalendarPageContent() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [mode, setMode] = useState<CalendarMode>('agenda');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'timeline' || saved === 'month' || saved === 'agenda') {
        setMode(saved);
      } else if (window.matchMedia('(max-width: 767px)').matches) {
        setMode('agenda');
      } else {
        setMode('timeline');
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const setModePersist = (next: CalendarMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const effectiveMode =
    !hydrated && isMobile ? 'agenda' : !hydrated ? 'timeline' : mode;

  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-[1600px] flex-col gap-4">
      <Tabs
        value={effectiveMode}
        onValueChange={(value) => setModePersist(value as CalendarMode)}
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

      <div
        className={cn(
          'min-h-0 flex-1 overflow-hidden rounded-[12px] border border-border bg-card',
          effectiveMode === 'timeline' && 'overflow-x-auto'
        )}
      >
        {!hydrated ? (
          <div className="p-6 text-sm text-muted-foreground">Loading calendar…</div>
        ) : effectiveMode === 'timeline' ? (
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
