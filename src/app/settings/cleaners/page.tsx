'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  DollarSign,
  RefreshCw,
  Save,
  Star,
  Users,
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CleanerAssignment, CleanerPayoutRate } from '@/lib/types';
import { cn } from '@/lib/utils';
import toast, { Toaster } from 'react-hot-toast';

interface ApartmentRow {
  id: string;
  apartment_number: string;
  uplisting_name: string | null;
}

interface CleanerRow {
  id: string;
  name: string;
}

function getPropertyLabel(apt: ApartmentRow) {
  return apt.uplisting_name || apt.apartment_number;
}

function CleanerSettingsContent() {
  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState<ApartmentRow[]>([]);
  const [cleaners, setCleaners] = useState<CleanerRow[]>([]);
  const [assignments, setAssignments] = useState<CleanerAssignment[]>([]);
  const [rates, setRates] = useState<CleanerPayoutRate[]>([]);
  const [savingAssignment, setSavingAssignment] = useState<string | null>(null);
  const [savingRate, setSavingRate] = useState<string | null>(null);
  const [minNights, setMinNights] = useState('5');
  const [intervalNights, setIntervalNights] = useState('5');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Local edit state for assignments: apartmentId -> { cleanerId -> isAssigned, primaryCleanerId }
  const [assignmentDraft, setAssignmentDraft] = useState<
    Record<string, { assigned: Set<string>; primary: string | null }>
  >({});

  // Local edit state for rates: `${cleanerId}-${apartmentId}` -> rates
  const [rateDraft, setRateDraft] = useState<
    Record<string, { checkout: string; midstay: string }>
  >({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [aptRes, cleanerRes, assignRes, ratesRes, scheduleRes] = await Promise.all([
        fetch('/api/apartments'),
        fetch('/api/cleaners'),
        fetch('/api/cleaning/assignments'),
        fetch('/api/cleaning/rates'),
        fetch('/api/settings/cleaning-schedule'),
      ]);

      const [aptJson, cleanerJson, assignJson, ratesJson, scheduleJson] = await Promise.all([
        aptRes.json(),
        cleanerRes.json(),
        assignRes.json(),
        ratesRes.json(),
        scheduleRes.json(),
      ]);

      const aptList: ApartmentRow[] = aptJson.success ? aptJson.data : aptJson.data ?? [];
      const cleanerList: CleanerRow[] = cleanerJson.success
        ? cleanerJson.data
        : cleanerJson.data ?? [];
      const assignList: CleanerAssignment[] = assignJson.success ? assignJson.data : [];
      const rateList: CleanerPayoutRate[] = ratesJson.success ? ratesJson.data : [];

      setApartments(aptList);
      setCleaners(cleanerList);
      setAssignments(assignList);
      setRates(rateList);

      const draft: Record<string, { assigned: Set<string>; primary: string | null }> = {};
      for (const apt of aptList) {
        const aptAssignments = assignList.filter((a) => a.apartment_id === apt.id);
        draft[apt.id] = {
          assigned: new Set(aptAssignments.map((a) => a.cleaner_id)),
          primary: aptAssignments.find((a) => a.is_primary)?.cleaner_id ?? null,
        };
      }
      setAssignmentDraft(draft);

      const rateDraftMap: Record<string, { checkout: string; midstay: string }> = {};
      for (const rate of rateList) {
        rateDraftMap[`${rate.cleaner_id}-${rate.apartment_id}`] = {
          checkout: String(rate.checkout_clean_rate),
          midstay: String(rate.midstay_clean_rate),
        };
      }
      setRateDraft(rateDraftMap);

      if (scheduleJson.success && scheduleJson.data) {
        setMinNights(String(scheduleJson.data.minNights));
        setIntervalNights(String(scheduleJson.data.intervalNights));
      }
    } catch {
      toast.error('Failed to load cleaner settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rateRows = useMemo(() => {
    const rows: {
      cleaner_id: string;
      apartment_id: string;
      cleaner_name: string;
      apartment_name: string;
    }[] = [];

    for (const assignment of assignments) {
      rows.push({
        cleaner_id: assignment.cleaner_id,
        apartment_id: assignment.apartment_id,
        cleaner_name: assignment.cleaner_name ?? 'Unknown',
        apartment_name: assignment.apartment_name ?? 'Unknown',
      });
    }

    const seen = new Set<string>();
    return rows.filter((r) => {
      const key = `${r.cleaner_id}-${r.apartment_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [assignments]);

  const toggleAssignment = (apartmentId: string, cleanerId: string) => {
    setAssignmentDraft((prev) => {
      const current = prev[apartmentId] ?? { assigned: new Set<string>(), primary: null };
      const assigned = new Set(current.assigned);
      if (assigned.has(cleanerId)) {
        assigned.delete(cleanerId);
        const primary = current.primary === cleanerId ? null : current.primary;
        return { ...prev, [apartmentId]: { assigned, primary } };
      }
      assigned.add(cleanerId);
      return {
        ...prev,
        [apartmentId]: {
          assigned,
          primary: current.primary ?? cleanerId,
        },
      };
    });
  };

  const setPrimary = (apartmentId: string, cleanerId: string) => {
    setAssignmentDraft((prev) => {
      const current = prev[apartmentId] ?? { assigned: new Set<string>(), primary: null };
      const assigned = new Set(current.assigned);
      assigned.add(cleanerId);
      return { ...prev, [apartmentId]: { assigned, primary: cleanerId } };
    });
  };

  const saveApartmentAssignments = async (apartmentId: string) => {
    const draft = assignmentDraft[apartmentId];
    if (!draft) return;

    setSavingAssignment(apartmentId);
    try {
      const existing = assignments.filter((a) => a.apartment_id === apartmentId);
      const existingIds = new Set(existing.map((a) => a.cleaner_id));

      for (const cleanerId of draft.assigned) {
        await fetch('/api/cleaning/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cleaner_id: cleanerId,
            apartment_id: apartmentId,
            is_primary: draft.primary === cleanerId,
          }),
        });
      }

      for (const existingAssignment of existing) {
        if (!draft.assigned.has(existingAssignment.cleaner_id)) {
          await fetch('/api/cleaning/assignments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cleaner_id: existingAssignment.cleaner_id,
              apartment_id: apartmentId,
            }),
          });
        }
      }

      if (draft.primary && !existingIds.has(draft.primary)) {
        await fetch('/api/cleaning/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cleaner_id: draft.primary,
            apartment_id: apartmentId,
            is_primary: true,
          }),
        });
      }

      toast.success('Assignments saved');
      await loadData();
    } catch {
      toast.error('Failed to save assignments');
    } finally {
      setSavingAssignment(null);
    }
  };

  const getRateDraft = (cleanerId: string, apartmentId: string) => {
    const key = `${cleanerId}-${apartmentId}`;
    if (rateDraft[key]) return rateDraft[key];
    const existing = rates.find(
      (r) => r.cleaner_id === cleanerId && r.apartment_id === apartmentId
    );
    return {
      checkout: existing ? String(existing.checkout_clean_rate) : '0',
      midstay: existing ? String(existing.midstay_clean_rate) : '0',
    };
  };

  const saveRate = async (cleanerId: string, apartmentId: string) => {
    const key = `${cleanerId}-${apartmentId}`;
    const draft = getRateDraft(cleanerId, apartmentId);
    setSavingRate(key);
    try {
      const response = await fetch('/api/cleaning/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cleaner_id: cleanerId,
          apartment_id: apartmentId,
          checkout_clean_rate: parseFloat(draft.checkout) || 0,
          midstay_clean_rate: parseFloat(draft.midstay) || 0,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to save rate');
      }
      toast.success('Rate saved');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save rate');
    } finally {
      setSavingRate(null);
    }
  };

  const saveSchedule = async () => {
    const min = parseInt(minNights, 10);
    const interval = parseInt(intervalNights, 10);
    if (!Number.isFinite(min) || min < 1 || !Number.isFinite(interval) || interval < 1) {
      toast.error('Both values must be whole numbers of at least 1');
      return;
    }

    try {
      setSavingSchedule(true);
      const response = await fetch('/api/settings/cleaning-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minNights: min, intervalNights: interval }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to save schedule');
      }
      setMinNights(String(result.data.minNights));
      setIntervalNights(String(result.data.intervalNights));
      toast.success('Cleaning schedule saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/cleaning"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Cleaning
          </Link>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              Cleaner Management
            </h1>
            <p className="text-gray-600 mt-2">
              Assign cleaners to properties, set payout rates, and configure mid-stay cleaning rules
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="assignments" className="gap-2">
              <Building2 className="w-4 h-4" />
              Property Assignments
            </TabsTrigger>
            <TabsTrigger value="rates" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Payout Rates
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarDays className="w-4 h-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">Loading...</CardContent>
              </Card>
            ) : cleaners.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No cleaners found. Add cleaners in Settings → General first.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {apartments.map((apt) => {
                  const draft = assignmentDraft[apt.id] ?? {
                    assigned: new Set<string>(),
                    primary: null,
                  };
                  const primaryCleaner = cleaners.find((c) => c.id === draft.primary);

                  return (
                    <Card key={apt.id}>
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <CardTitle className="text-base">{getPropertyLabel(apt)}</CardTitle>
                          {primaryCleaner ? (
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 w-fit">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Primary: {primaryCleaner.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-700 border-amber-300 w-fit">
                              No primary cleaner
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 pr-4 font-medium text-gray-600">
                                  Cleaner
                                </th>
                                <th className="text-center py-2 px-2 font-medium text-gray-600">
                                  Assigned
                                </th>
                                <th className="text-center py-2 px-2 font-medium text-gray-600">
                                  Primary
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {cleaners.map((cleaner) => {
                                const isAssigned = draft.assigned.has(cleaner.id);
                                const isPrimary = draft.primary === cleaner.id;
                                return (
                                  <tr key={cleaner.id} className="border-b last:border-0">
                                    <td className="py-2 pr-4">{cleaner.name}</td>
                                    <td className="py-2 px-2 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isAssigned}
                                        onChange={() => toggleAssignment(apt.id, cleaner.id)}
                                        className="rounded border-gray-300"
                                        aria-label={`Assign ${cleaner.name} to ${getPropertyLabel(apt)}`}
                                      />
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <button
                                        type="button"
                                        disabled={!isAssigned}
                                        onClick={() => setPrimary(apt.id, cleaner.id)}
                                        className={cn(
                                          'p-1 rounded disabled:opacity-30',
                                          isPrimary
                                            ? 'text-yellow-500'
                                            : 'text-gray-300 hover:text-yellow-400'
                                        )}
                                        aria-label={`Set ${cleaner.name} as primary for ${getPropertyLabel(apt)}`}
                                      >
                                        <Star
                                          className={cn('w-4 h-4', isPrimary && 'fill-current')}
                                        />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => saveApartmentAssignments(apt.id)}
                            disabled={savingAssignment === apt.id}
                          >
                            <Save className="w-4 h-4 mr-1" />
                            {savingAssignment === apt.id ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rates">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">Loading...</CardContent>
              </Card>
            ) : rateRows.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  No cleaner–property assignments yet. Configure assignments first.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">
                            Cleaner
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">
                            Property
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">
                            Checkout (ZAR)
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">
                            Mid-Stay (ZAR)
                          </th>
                          <th className="text-right px-4 py-3 font-semibold text-gray-700">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateRows.map((row) => {
                          const key = `${row.cleaner_id}-${row.apartment_id}`;
                          const draft = getRateDraft(row.cleaner_id, row.apartment_id);
                          return (
                            <tr key={key} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="px-4 py-3">{row.cleaner_name}</td>
                              <td className="px-4 py-3">{row.apartment_name}</td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.checkout}
                                  onChange={(e) =>
                                    setRateDraft((prev) => ({
                                      ...prev,
                                      [key]: { ...draft, checkout: e.target.value },
                                    }))
                                  }
                                  className="w-28 h-8"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draft.midstay}
                                  onChange={(e) =>
                                    setRateDraft((prev) => ({
                                      ...prev,
                                      [key]: { ...draft, midstay: e.target.value },
                                    }))
                                  }
                                  className="w-28 h-8"
                                />
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => saveRate(row.cleaner_id, row.apartment_id)}
                                  disabled={savingRate === key}
                                >
                                  {savingRate === key ? 'Saving...' : 'Save'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mid-stay cleaning rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 max-w-xl">
                <p className="text-sm text-gray-600">
                  Checkout cleans are always created on the check-out date. Mid-stay cleans are
                  added when a stay is longer than the threshold, then repeated every interval
                  until checkout (never on check-in or checkout day).
                </p>
                <div className="space-y-2">
                  <label htmlFor="min-nights" className="text-sm font-medium text-gray-700">
                    Create mid-stay cleans when a stay is longer than
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="min-nights"
                      type="number"
                      min="1"
                      step="1"
                      value={minNights}
                      onChange={(e) => setMinNights(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">nights</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="interval-nights" className="text-sm font-medium text-gray-700">
                    Then every
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="interval-nights"
                      type="number"
                      min="1"
                      step="1"
                      value={intervalNights}
                      onChange={(e) => setIntervalNights(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">nights until checkout</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Example: with 5 and 5, a 16-night stay gets mid-stays on days 5, 10 and 15, plus
                  a checkout clean on day 16. Existing tasks do not change until a booking updates
                  or you run Generate Cleaning Tasks. Manual calendar edits are kept.
                </p>
                <div className="flex justify-end">
                  <Button onClick={saveSchedule} disabled={savingSchedule || loading}>
                    <Save className="w-4 h-4 mr-1" />
                    {savingSchedule ? 'Saving...' : 'Save schedule'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default function CleanerSettingsPage() {
  return (
    <AuthWrapper>
      <CleanerSettingsContent />
    </AuthWrapper>
  );
}
