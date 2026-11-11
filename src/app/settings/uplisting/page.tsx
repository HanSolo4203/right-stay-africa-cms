'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Link2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { UplistingSyncStatus } from '@/components/uplisting/UplistingSyncStatus';
import ResponsiveTable from '@/components/ui/ResponsiveTable';
import { createClientComponentClient } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

interface UplistingApartment extends Record<string, unknown> {
  id: string;
  apartment_number: string;
  uplisting_id: string;
  uplisting_name: string | null;
  is_active: boolean | null;
}

interface SyncListingsResult {
  synced: number;
  errors: string[];
}

interface SyncBookingsResult {
  synced: number;
  skipped: number;
  cancelled?: number;
  errors: string[];
}

interface SyncResponse {
  listings?: SyncListingsResult;
  bookings?: SyncBookingsResult;
  error?: string;
}

interface CleaningGenerateResult {
  generated: number;
  skipped: number;
  errors: string[];
  error?: string;
}

async function parseJsonResponse<T extends { error?: string }>(
  response: Response
): Promise<{ data: T | null; error: string | null }> {
  const text = await response.text();
  const preview = text.replace(/\s+/g, ' ').trim().slice(0, 200);

  if (!text.trim()) {
    return {
      data: null,
      error: `Sync failed (HTTP ${response.status}): empty response`,
    };
  }

  try {
    return { data: JSON.parse(text) as T, error: null };
  } catch {
    return {
      data: null,
      error: `Sync failed (HTTP ${response.status}): ${preview || 'non-JSON response'}`,
    };
  }
}

function UplistingSettingsContent() {
  const [apartments, setApartments] = useState<UplistingApartment[]>([]);
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState<'listings' | 'bookings' | null>(null);
  const [syncingPropertyId, setSyncingPropertyId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [generatingCleaning, setGeneratingCleaning] = useState(false);
  const [cleaningGenerateResult, setCleaningGenerateResult] =
    useState<CleaningGenerateResult | null>(null);
  const [syncStatusKey, setSyncStatusKey] = useState(0);

  const loadIntegrationData = useCallback(async () => {
    try {
      setLoadingData(true);
      const supabase = createClientComponentClient();

      const [apartmentsResult, bookingsResult] = await Promise.all([
        supabase
          .from('apartments')
          .select('id, apartment_number, uplisting_id, uplisting_name, is_active')
          .not('uplisting_id', 'is', null)
          .order('apartment_number'),
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('source', ['uplisting_api', 'uplisting_webhook']),
      ]);

      if (apartmentsResult.error) {
        throw new Error(apartmentsResult.error.message);
      }

      if (bookingsResult.error) {
        throw new Error(bookingsResult.error.message);
      }

      setApartments((apartmentsResult.data ?? []) as UplistingApartment[]);
      setBookingCount(bookingsResult.count ?? 0);
      setSyncStatusKey((key) => key + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load Uplisting data';
      toast.error(message);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrationData();
  }, [loadIntegrationData]);

  const handlePropertySync = async (
    uplistingId: string,
    apartmentNumber: string,
    isActive: boolean | null
  ) => {
    if (isActive === false) {
      toast.error(
        `${apartmentNumber} is disabled — booking dates are not synced (existing records kept)`
      );
      return;
    }

    const syncSecret = process.env.NEXT_PUBLIC_SYNC_SECRET;

    if (!syncSecret) {
      toast.error('NEXT_PUBLIC_SYNC_SECRET is not configured');
      return;
    }

    try {
      setSyncingPropertyId(uplistingId);

      const response = await fetch('/api/uplisting/sync/property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': syncSecret,
        },
        body: JSON.stringify({ uplisting_id: uplistingId }),
      });

      const { data, error: parseError } = await parseJsonResponse<
        SyncBookingsResult & { error?: string }
      >(response);

      if (parseError) {
        toast.error(parseError);
        return;
      }

      if (!response.ok) {
        toast.error(data?.error ?? `Failed to sync ${apartmentNumber}`);
        return;
      }

      if (!data) {
        toast.error(`Failed to sync ${apartmentNumber}`);
        return;
      }

      if (data.errors.length > 0) {
        toast.error(
          `Synced ${apartmentNumber}: ${data.synced} bookings (${data.errors.length} errors)`
        );
      } else {
        toast.success(
          `Synced ${data.synced} booking${data.synced === 1 ? '' : 's'} for ${apartmentNumber}`
        );
      }

      await loadIntegrationData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync request failed';
      toast.error(message);
    } finally {
      setSyncingPropertyId(null);
    }
  };

  const handleGenerateCleaningTasks = async () => {
    const syncSecret = process.env.NEXT_PUBLIC_SYNC_SECRET;

    if (!syncSecret) {
      toast.error('NEXT_PUBLIC_SYNC_SECRET is not configured');
      return;
    }

    try {
      setGeneratingCleaning(true);
      setCleaningGenerateResult(null);

      const response = await fetch('/api/cleaning/generate', {
        method: 'POST',
        headers: {
          'x-sync-secret': syncSecret,
        },
      });

      const data = (await response.json()) as CleaningGenerateResult;

      if (!response.ok) {
        const message = data.error ?? 'Failed to generate cleaning tasks';
        setCleaningGenerateResult({
          generated: 0,
          skipped: 0,
          errors: data.errors ?? [],
          error: message,
        });
        toast.error(message);
        return;
      }

      setCleaningGenerateResult(data);

      if (data.errors.length > 0) {
        toast.error(
          `Generated tasks for ${data.generated} booking${data.generated === 1 ? '' : 's'} (${data.errors.length} errors)`
        );
      } else {
        toast.success(
          `Generated cleaning tasks for ${data.generated} booking${data.generated === 1 ? '' : 's'}`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generate request failed';
      setCleaningGenerateResult({
        generated: 0,
        skipped: 0,
        errors: [],
        error: message,
      });
      toast.error(message);
    } finally {
      setGeneratingCleaning(false);
    }
  };

  const handleSync = async () => {
    const syncSecret = process.env.NEXT_PUBLIC_SYNC_SECRET;

    if (!syncSecret) {
      toast.error('NEXT_PUBLIC_SYNC_SECRET is not configured');
      return;
    }

    try {
      setSyncing(true);
      setSyncResult(null);
      setSyncPhase('listings');
      toast.loading('Syncing listings…', { id: 'uplisting-sync' });

      const listingsResponse = await fetch('/api/uplisting/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-secret': syncSecret,
        },
        body: JSON.stringify({ scope: 'listings' }),
      });

      const listingsParsed = await parseJsonResponse<SyncResponse>(listingsResponse);
      if (listingsParsed.error) {
        setSyncResult({ error: listingsParsed.error });
        toast.error(listingsParsed.error, { id: 'uplisting-sync' });
        return;
      }

      if (!listingsResponse.ok) {
        const message = listingsParsed.data?.error ?? 'Listings sync failed';
        setSyncResult({ error: message });
        toast.error(message, { id: 'uplisting-sync' });
        return;
      }

      setSyncPhase('bookings');
      toast.loading('Syncing bookings…', { id: 'uplisting-sync' });

      // Refresh linked apartments after listings sync, then sync bookings
      // per active property so each request stays under proxy timeouts.
      // Disabled apartments are skipped; existing booking rows stay in the DB.
      const supabase = createClientComponentClient();
      const { data: linkedApartments, error: linkedError } = await supabase
        .from('apartments')
        .select('id, apartment_number, uplisting_id, uplisting_name, is_active')
        .not('uplisting_id', 'is', null)
        .order('apartment_number');

      if (linkedError) {
        const message = linkedError.message;
        setSyncResult({
          listings: listingsParsed.data?.listings,
          error: message,
        });
        toast.error(message, { id: 'uplisting-sync' });
        return;
      }

      const linked = (linkedApartments ?? []) as UplistingApartment[];
      setApartments(linked);
      const activeLinked = linked.filter((apartment) => apartment.is_active !== false);

      const bookingsAggregate: SyncBookingsResult = {
        synced: 0,
        skipped: 0,
        cancelled: 0,
        errors: [],
      };

      for (let index = 0; index < activeLinked.length; index += 1) {
        const apartment = activeLinked[index];
        toast.loading(
          `Syncing bookings ${index + 1}/${activeLinked.length}: ${apartment.apartment_number}`,
          { id: 'uplisting-sync' }
        );

        const propertyResponse = await fetch('/api/uplisting/sync/property', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-sync-secret': syncSecret,
          },
          body: JSON.stringify({ uplisting_id: apartment.uplisting_id }),
        });

        const propertyParsed = await parseJsonResponse<
          SyncBookingsResult & { error?: string }
        >(propertyResponse);

        if (propertyParsed.error) {
          bookingsAggregate.errors.push(
            `${apartment.apartment_number}: ${propertyParsed.error}`
          );
          continue;
        }

        if (!propertyResponse.ok || !propertyParsed.data) {
          bookingsAggregate.errors.push(
            `${apartment.apartment_number}: ${
              propertyParsed.data?.error ?? 'Bookings sync failed'
            }`
          );
          continue;
        }

        bookingsAggregate.synced += propertyParsed.data.synced;
        bookingsAggregate.skipped += propertyParsed.data.skipped;
        bookingsAggregate.cancelled =
          (bookingsAggregate.cancelled ?? 0) +
          (propertyParsed.data.cancelled ?? 0);
        bookingsAggregate.errors.push(
          ...propertyParsed.data.errors.map(
            (error) => `${apartment.apartment_number}: ${error}`
          )
        );
      }

      const merged: SyncResponse = {
        listings: listingsParsed.data?.listings,
        bookings: bookingsAggregate,
      };
      setSyncResult(merged);
      toast.success('Uplisting sync completed', { id: 'uplisting-sync' });
      await loadIntegrationData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync request failed';
      setSyncResult({ error: message });
      toast.error(message, { id: 'uplisting-sync' });
    } finally {
      setSyncing(false);
      setSyncPhase(null);
    }
  };

  const hasSyncErrors =
    (syncResult?.listings?.errors.length ?? 0) > 0 ||
    (syncResult?.bookings?.errors.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Settings
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Link2 className="w-8 h-8 text-blue-600" />
                Uplisting Integration
              </h1>
              <p className="text-gray-600 mt-2">
                Sync listings and bookings from Uplisting and monitor linked properties
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Generate Cleaning Tasks uses mid-stay rules from{' '}
                <Link href="/settings/cleaners" className="text-blue-600 hover:underline">
                  Cleaner Management → Schedule
                </Link>
                . Manual calendar edits are kept.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/updates"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Activity className="w-4 h-4 mr-2" />
                View Updates
              </Link>
              <button
                onClick={handleGenerateCleaningTasks}
                disabled={syncing || generatingCleaning}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles
                  className={`w-4 h-4 mr-2 ${generatingCleaning ? 'animate-pulse' : ''}`}
                />
                {generatingCleaning ? 'Generating...' : 'Generate Cleaning Tasks'}
              </button>
              <button
                onClick={handleSync}
                disabled={syncing || generatingCleaning}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing
                  ? syncPhase === 'bookings'
                    ? 'Syncing bookings...'
                    : 'Syncing listings...'
                  : 'Sync Now'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Linked Apartments</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loadingData ? '—' : apartments.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {loadingData
                ? '…'
                : `${apartments.filter((apt) => apt.is_active !== false).length} active · ${
                    apartments.filter((apt) => apt.is_active === false).length
                  } disabled`}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Uplisting Bookings</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {loadingData ? '—' : bookingCount ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              source: uplisting_api, uplisting_webhook
            </p>
          </div>
          <UplistingSyncStatus refreshKey={syncStatusKey} />
        </div>

        {cleaningGenerateResult && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              {cleaningGenerateResult.error || cleaningGenerateResult.errors.length > 0 ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              <h2 className="text-lg font-medium text-gray-900">
                Last Cleaning Tasks Generation
              </h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {cleaningGenerateResult.error ? (
                <p className="text-sm text-red-600">{cleaningGenerateResult.error}</p>
              ) : (
                <p className="text-sm text-gray-600">
                  Generated: {cleaningGenerateResult.generated} · Skipped:{' '}
                  {cleaningGenerateResult.skipped}
                </p>
              )}
              {cleaningGenerateResult.errors.length > 0 && (
                <ul className="space-y-1">
                  {cleaningGenerateResult.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600">
                      {error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {syncResult && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
              {syncResult.error || hasSyncErrors ? (
                <AlertCircle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              <h2 className="text-lg font-medium text-gray-900">Last Sync Result</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              {syncResult.error && (
                <p className="text-sm text-red-600">{syncResult.error}</p>
              )}
              {syncResult.listings && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Listings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Synced: {syncResult.listings.synced}
                  </p>
                  {syncResult.listings.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {syncResult.listings.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600">
                          {error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {syncResult.bookings && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Bookings</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Synced: {syncResult.bookings.synced} · Skipped:{' '}
                    {syncResult.bookings.skipped}
                    {typeof syncResult.bookings.cancelled === 'number'
                      ? ` · Cancelled: ${syncResult.bookings.cancelled}`
                      : ''}
                  </p>
                  {syncResult.bookings.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {syncResult.bookings.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600">
                          {error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Linked Apartments</h2>
            <p className="text-sm text-gray-600 mt-1">
              Properties with a Uplisting listing ID. Disabled properties are skipped on
              sync; existing booking records are kept.
            </p>
          </div>

          {loadingData ? (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-2 text-gray-600">Loading apartments...</span>
            </div>
          ) : (
            <ResponsiveTable<UplistingApartment>
              data={apartments}
              emptyMessage="No apartments linked to Uplisting yet. Run a sync to import listings."
              columns={[
                {
                  key: 'apartment_number',
                  label: 'Apartment',
                },
                {
                  key: 'uplisting_id',
                  label: 'Uplisting ID',
                },
                {
                  key: 'uplisting_name',
                  label: 'Uplisting Name',
                  render: (value) => (value as string | null) ?? '—',
                },
                {
                  key: 'is_active',
                  label: 'Status',
                  render: (value) =>
                    value === false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                        Active
                      </span>
                    ),
                },
                {
                  key: 'id',
                  label: 'Actions',
                  render: (_, item) => {
                    const isSyncing = syncingPropertyId === item.uplisting_id;
                    const propertyDisabled = item.is_active === false;
                    const isDisabled = syncing || isSyncing || propertyDisabled;

                    return (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePropertySync(
                            item.uplisting_id,
                            item.apartment_number,
                            item.is_active
                          );
                        }}
                        disabled={isDisabled}
                        title={
                          propertyDisabled
                            ? 'Disabled properties are not synced; existing records are kept'
                            : undefined
                        }
                        className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`}
                        />
                        {propertyDisabled
                          ? 'Skipped'
                          : isSyncing
                            ? 'Syncing...'
                            : 'Sync Bookings'}
                      </button>
                    );
                  },
                },
              ]}
            />
          )}
        </div>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default function UplistingSettingsPage() {
  return (
    <AuthWrapper>
      <UplistingSettingsContent />
    </AuthWrapper>
  );
}
