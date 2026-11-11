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
import {
  DEFAULT_MIDSTAY_FLEX_DAYS,
  DEFAULT_MIDSTAY_MAX_GAP,
  DEFAULT_MIDSTAY_MIN_NIGHTS,
  DEFAULT_MIDSTAY_TARGET_GAP,
  normalizeMidstaySettings,
  planMidstayNights,
} from '@/lib/cleaning-schedule';
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
  daily_capacity_minutes?: number;
  is_on_call?: boolean;
  is_active?: boolean;
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
  const [minNights, setMinNights] = useState(String(DEFAULT_MIDSTAY_MIN_NIGHTS));
  const [targetGap, setTargetGap] = useState(String(DEFAULT_MIDSTAY_TARGET_GAP));
  const [maxGap, setMaxGap] = useState(String(DEFAULT_MIDSTAY_MAX_GAP));
  const [flexDays, setFlexDays] = useState(String(DEFAULT_MIDSTAY_FLEX_DAYS));
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [teamDraft, setTeamDraft] = useState<
    Record<string, { capacity: string; onCall: boolean; active: boolean }>
  >({});

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

      const nextTeam: Record<string, { capacity: string; onCall: boolean; active: boolean }> = {};
      for (const c of cleanerList) {
        nextTeam[c.id] = {
          capacity: String(c.daily_capacity_minutes ?? 450),
          onCall: Boolean(c.is_on_call),
          active: c.is_active !== false,
        };
      }
      setTeamDraft(nextTeam);

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
        setTargetGap(String(scheduleJson.data.targetGap));
        setMaxGap(String(scheduleJson.data.maxGap));
        setFlexDays(String(scheduleJson.data.flexDays));
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

  const previewSettings = useMemo(
    () =>
      normalizeMidstaySettings(
        parseInt(minNights, 10),
        parseInt(targetGap, 10),
        parseInt(maxGap, 10),
        parseInt(flexDays, 10)
      ),
    [minNights, targetGap, maxGap, flexDays]
  );

  const schedulePreview = useMemo(() => {
    const rows: { nights: number; count: number; offsets: number[] }[] = [];
    for (let nights = 5; nights <= 31; nights++) {
      const offsets = planMidstayNights(nights, previewSettings);
      rows.push({ nights, count: offsets.length, offsets });
    }
    return rows;
  }, [previewSettings]);

  const saveSchedule = async () => {
    const min = parseInt(minNights, 10);
    const target = parseInt(targetGap, 10);
    const max = parseInt(maxGap, 10);
    const flex = parseInt(flexDays, 10);

    if (
      !Number.isFinite(min) ||
      min < 1 ||
      !Number.isFinite(target) ||
      target < 1 ||
      !Number.isFinite(max) ||
      max < 1 ||
      !Number.isFinite(flex) ||
      flex < 0
    ) {
      toast.error('Minimum stay, target gap, and max gap must be ≥ 1; flex days ≥ 0');
      return;
    }

    if (max < target) {
      toast.error('Max gap must be greater than or equal to target gap');
      return;
    }

    try {
      setSavingSchedule(true);
      const response = await fetch('/api/settings/cleaning-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minNights: min,
          targetGap: target,
          maxGap: max,
          flexDays: flex,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to save schedule');
      }
      setMinNights(String(result.data.minNights));
      setTargetGap(String(result.data.targetGap));
      setMaxGap(String(result.data.maxGap));
      setFlexDays(String(result.data.flexDays));
      toast.success('Cleaning schedule saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  };


  const saveTeamMember = async (cleanerId: string) => {
    const draft = teamDraft[cleanerId];
    if (!draft) return;
    const capacity = Number(draft.capacity);
    if (!Number.isFinite(capacity) || capacity < 30) {
      toast.error('Daily capacity must be at least 30 minutes');
      return;
    }
    try {
      setSavingTeamId(cleanerId);
      const response = await fetch(`/api/cleaners/${cleanerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          daily_capacity_minutes: Math.floor(capacity),
          is_on_call: draft.onCall,
          is_active: draft.active,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? 'Failed to save cleaner capacity');
      }
      setCleaners((prev) =>
        prev.map((c) =>
          c.id === cleanerId
            ? {
                ...c,
                daily_capacity_minutes: Math.floor(capacity),
                is_on_call: draft.onCall,
                is_active: draft.active,
              }
            : c
        )
      );
      toast.success('Team capacity saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingTeamId(null);
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
            <TabsTrigger value="team" className="gap-2">
              <Users className="w-4 h-4" />
              Team
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
              <CardContent className="space-y-6 max-w-3xl">
                <p className="text-sm text-gray-600">
                  Checkout cleans are always on the check-out date. Mid-stay cleans are placed
                  evenly through longer stays (about one per target gap), never on check-in,
                  checkout, or the night before checkout. Max gap guarantees guests never go
                  longer without a clean. Flex days are reserved for future load balancing.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="min-nights" className="text-sm font-medium text-gray-700">
                      Minimum stay
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
                      <span className="text-sm text-gray-600">nights (≤ this → no mid-stay)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="target-gap" className="text-sm font-medium text-gray-700">
                      Target gap
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="target-gap"
                        type="number"
                        min="1"
                        step="1"
                        value={targetGap}
                        onChange={(e) => setTargetGap(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">nights (~one clean per week)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="max-gap" className="text-sm font-medium text-gray-700">
                      Max gap
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="max-gap"
                        type="number"
                        min="1"
                        step="1"
                        value={maxGap}
                        onChange={(e) => setMaxGap(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">nights (hard ceiling)</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="flex-days" className="text-sm font-medium text-gray-700">
                      Flex days
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="flex-days"
                        type="number"
                        min="0"
                        step="1"
                        value={flexDays}
                        onChange={(e) => setFlexDays(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">± days for balancing</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Defaults 5 / 7 / 8 / 1: a 7-night stay gets one mid-stay on night 4 (not night 5)
                  plus checkout on night 7. Locked or completed tasks are kept when regenerating;
                  only future pending unlocked tasks are replaced.
                </p>
                <div className="flex justify-end">
                  <Button onClick={saveSchedule} disabled={savingSchedule || loading}>
                    <Save className="w-4 h-4 mr-1" />
                    {savingSchedule ? 'Saving...' : 'Save schedule'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">Live preview</h3>
                  <p className="text-xs text-gray-500">
                    Stay length → mid-stay count and night offsets from check-in. Updates as you
                    edit the values above (save to persist).
                  </p>
                  <div className="overflow-x-auto rounded-md border border-gray-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Stay nights</th>
                          <th className="px-3 py-2 font-medium">Mid-stays</th>
                          <th className="px-3 py-2 font-medium">Night offsets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedulePreview.map((row) => (
                          <tr key={row.nights} className="border-t border-gray-100">
                            <td className="px-3 py-1.5 tabular-nums text-gray-900">{row.nights}</td>
                            <td className="px-3 py-1.5 tabular-nums text-gray-900">{row.count}</td>
                            <td className="px-3 py-1.5 text-gray-600">
                              {row.offsets.length === 0 ? '—' : row.offsets.join(', ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daily capacity & on-call</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Regular cleaners count toward team capacity (default 450 min / 7.5h).
                      The on-call person is never auto-assigned unless auto_use_on_call is enabled.
                    </p>
                    {cleaners.map((cleaner) => {
                      const draft = teamDraft[cleaner.id] ?? {
                        capacity: '450',
                        onCall: false,
                        active: true,
                      };
                      return (
                        <div
                          key={cleaner.id}
                          className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-end sm:justify-between"
                        >
                          <div className="space-y-3 flex-1">
                            <div className="font-medium text-gray-900">{cleaner.name}</div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Daily capacity (minutes)
                                </label>
                                <Input
                                  type="number"
                                  min={30}
                                  step={15}
                                  value={draft.capacity}
                                  onChange={(e) =>
                                    setTeamDraft((prev) => ({
                                      ...prev,
                                      [cleaner.id]: { ...draft, capacity: e.target.value },
                                    }))
                                  }
                                />
                              </div>
                              <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                                <input
                                  type="checkbox"
                                  checked={draft.onCall}
                                  onChange={(e) =>
                                    setTeamDraft((prev) => ({
                                      ...prev,
                                      [cleaner.id]: { ...draft, onCall: e.target.checked },
                                    }))
                                  }
                                />
                                On-call
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
                                <input
                                  type="checkbox"
                                  checked={draft.active}
                                  onChange={(e) =>
                                    setTeamDraft((prev) => ({
                                      ...prev,
                                      [cleaner.id]: { ...draft, active: e.target.checked },
                                    }))
                                  }
                                />
                                Active
                              </label>
                            </div>
                          </div>
                          <Button
                            onClick={() => void saveTeamMember(cleaner.id)}
                            disabled={savingTeamId === cleaner.id}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {savingTeamId === cleaner.id ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            )}
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
