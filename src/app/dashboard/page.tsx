'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { enZA } from 'date-fns/locale';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  Sparkles,
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { JobCard } from '@/components/app/job-card';
import { PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/empty-state';
import { JobCardSkeleton, StatTileSkeleton } from '@/components/app/skeletons';
import { StatTile, StatTileGrid } from '@/components/app/stat-tile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthSelector from '@/components/ui/MonthSelector';
import SummaryCards from '@/components/ui/SummaryCards';
import CleaningsByApartmentChart from '@/components/ui/CleaningsByApartmentChart';
import CleanerWorkloadChart from '@/components/ui/CleanerWorkloadChart';
import CleanerEarningsReport from '@/components/ui/CleanerEarningsReport';
import InvoicingTable from '@/components/ui/InvoicingTable';
import RSALaundryStats from '@/components/ui/RSALaundryStats';
import DashboardInventoryAnalytics from '@/components/ui/DashboardInventoryAnalytics';
import { mapCleaningStatus } from '@/lib/status';
import { getTodayIsoDate } from '@/lib/cleaning-month';

interface UpcomingCleaning {
  id: string;
  cleaning_date: string;
  cleaner_1_name: string;
  cleaner_2_name: string | null;
  is_multi_cleaner: boolean;
  apartment_number: string;
  owner_name: string;
  notes: string;
  property_category: string;
}

interface AnalyticsData {
  summary: {
    total_cleanings: number;
    active_apartments: number;
    active_cleaners: number;
    average_cleanings_per_apartment: string;
    total_revenue: number;
    net_revenue: number;
  };
  cleanings_by_apartment: Array<{
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    apartment_id: string;
  }>;
  cleaner_workload: Array<{
    cleaner_name: string;
    session_count: number;
    cleaner_id: string | null;
    primary_sessions: number;
    secondary_sessions: number;
  }>;
  cleaner_earnings: Array<{
    cleaner_name: string;
    cleaner_id: string | null;
    session_count: number;
    total_earnings: number;
    average_earnings_per_session: number;
    primary_sessions: number;
    secondary_sessions: number;
    cleaning_earnings: number;
    rsa_laundry_earnings: number;
    rsa_laundry_sessions: number;
  }>;
  insights: {
    most_active_apartment: {
      apartment_number: string;
      owner_name: string;
      cleaning_count: number;
      apartment_id: string;
    } | null;
    top_cleaner: {
      cleaner_name: string;
      session_count: number;
      cleaner_id: string;
    } | null;
  };
  invoicing_data: Array<{
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    total_amount: number;
    apartment_id: string;
  }>;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function DashboardContent() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMonth = localStorage.getItem('dashboard-selected-month');
      if (savedMonth) return savedMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string | undefined>();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingCleaning[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [today] = useState(() => getTodayIsoDate());
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    const loadUpcoming = async () => {
      try {
        setUpcomingLoading(true);
        const response = await fetch('/api/cleaning-sessions?upcoming=true');
        const result = await response.json();
        const rows: UpcomingCleaning[] = Array.isArray(result.data) ? result.data : [];
        rows.sort(
          (a, b) =>
            new Date(a.cleaning_date).getTime() - new Date(b.cleaning_date).getTime()
        );
        setUpcoming(rows);
      } catch {
        setUpcoming([]);
      } finally {
        setUpcomingLoading(false);
      }
    };
    void loadUpcoming();
  }, []);

  const loadAnalyticsData = async (month?: string, year?: string) => {
    try {
      setAnalyticsLoading(true);
      let url = '/api/analytics?';
      if (month) url += `month=${month}`;
      if (year) url += month ? `&year=${year}` : `year=${year}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) setAnalyticsData(result.data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalyticsData(selectedYear ? undefined : selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const todaysJobs = upcoming.filter((job) => {
    const d = new Date(job.cleaning_date);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === today;
  });

  const upNext = upcoming.slice(0, 6);
  const issueJobs = upcoming.filter((job) =>
    (job.notes || '').toLowerCase().includes('issue')
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={`${greetingForHour(now.getHours())}`}
        description={format(now, 'EEEE, d MMMM yyyy', { locale: enZA })}
        actions={
          <Button asChild className="min-h-11">
            <Link href="/cleaning?new=1">
              <Plus className="size-4" strokeWidth={1.75} />
              New job
            </Link>
          </Button>
        }
      />

      {upcomingLoading ? (
        <StatTileGrid>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatTileSkeleton key={i} />
          ))}
        </StatTileGrid>
      ) : (
        <StatTileGrid>
          <StatTile
            label="Today's jobs"
            value={todaysJobs.length}
            icon={Sparkles}
            sublabel={format(now, 'd MMM', { locale: enZA })}
          />
          <StatTile
            label="In progress"
            value={0}
            icon={Clock3}
            sublabel="Live updates on Jobs"
          />
          <StatTile
            label="Up next"
            value={upNext.length}
            icon={CheckCircle2}
            sublabel="Upcoming cleans"
          />
          <StatTile
            label="Issues"
            value={issueJobs.length}
            icon={AlertTriangle}
            sublabel={issueJobs.length ? 'Needs attention' : 'All clear'}
          />
        </StatTileGrid>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">Up next</h2>
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/cleaning">View all</Link>
          </Button>
        </div>
        {upcomingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : upNext.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No upcoming cleans"
            description="When bookings generate cleaning tasks, they’ll show up here."
            actionLabel="Open jobs"
            onAction={() => {
              window.location.href = '/cleaning';
            }}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {upNext.map((job) => {
              const cleaners = [
                job.cleaner_1_name,
                job.is_multi_cleaner ? job.cleaner_2_name : null,
              ].filter(Boolean) as string[];
              const date = new Date(job.cleaning_date);
              return (
                <JobCard
                  key={job.id}
                  propertyName={
                    job.apartment_number
                      ? `Apt ${job.apartment_number}`
                      : job.property_category || 'Property'
                  }
                  area={job.owner_name}
                  windowLabel={format(date, 'EEE, d MMM', { locale: enZA })}
                  cleanerNames={cleaners}
                  status={mapCleaningStatus('pending', {
                    hasAssignee: Boolean(job.cleaner_1_name),
                  })}
                  timeUntil={
                    date.toISOString().slice(0, 10) === today ? 'Today' : undefined
                  }
                  onOpen={() => {
                    window.location.href = '/cleaning';
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      {issueJobs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">
            Issues needing attention
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {issueJobs.slice(0, 4).map((job) => (
              <JobCard
                key={`issue-${job.id}`}
                propertyName={`Apt ${job.apartment_number}`}
                area={job.owner_name}
                windowLabel={format(new Date(job.cleaning_date), 'EEE, d MMM', {
                  locale: enZA,
                })}
                cleanerNames={[job.cleaner_1_name].filter(Boolean)}
                status="issue"
                onOpen={() => {
                  window.location.href = '/cleaning';
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Tabs defaultValue="analytics" className="pt-2">
        <TabsList className="h-11 w-full justify-start overflow-x-auto md:w-auto">
          <TabsTrigger value="analytics" className="min-h-9">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="insights" className="min-h-9">
            Insights
          </TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-4 space-y-6">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={(month) => {
              setSelectedMonth(month);
              setSelectedYear(undefined);
              if (typeof window !== 'undefined') {
                localStorage.setItem('dashboard-selected-month', month);
              }
            }}
            selectedYear={selectedYear}
            onYearChange={(year) => {
              setSelectedYear(year);
              setSelectedMonth('');
            }}
          />
          {analyticsLoading ? (
            <StatTileGrid>
              {Array.from({ length: 4 }).map((_, i) => (
                <StatTileSkeleton key={i} />
              ))}
            </StatTileGrid>
          ) : analyticsData ? (
            <>
              <InvoicingTable
                data={analyticsData.invoicing_data}
                month={selectedMonth}
                year={selectedYear}
              />
              <RSALaundryStats selectedMonth={selectedMonth} />
              <DashboardInventoryAnalytics />
              <div className="flex justify-center">
                <div className="w-full max-w-6xl">
                  <SummaryCards data={analyticsData.summary} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                <CleaningsByApartmentChart
                  data={analyticsData.cleanings_by_apartment}
                />
                <CleanerWorkloadChart data={analyticsData.cleaner_workload} />
              </div>
              <CleanerEarningsReport data={analyticsData.cleaner_earnings} />
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          {analyticsData?.insights ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {analyticsData.insights.most_active_apartment ? (
                <StatTile
                  label="Most active apartment"
                  value={`Apt ${analyticsData.insights.most_active_apartment.apartment_number}`}
                  sublabel={`${analyticsData.insights.most_active_apartment.cleaning_count} cleanings`}
                />
              ) : null}
              {analyticsData.insights.top_cleaner ? (
                <StatTile
                  label="Top performer"
                  value={analyticsData.insights.top_cleaner.cleaner_name}
                  sublabel={`${analyticsData.insights.top_cleaner.session_count} sessions`}
                />
              ) : null}
              <StatTile
                label="Avg per apartment"
                value={analyticsData.summary.average_cleanings_per_apartment}
                sublabel="cleanings this month"
              />
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No insights yet"
              description="Insights appear once cleaning data is available for the selected period."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  );
}
