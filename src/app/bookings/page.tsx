'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Calendar, RefreshCw, User } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  getBookingsWithDetails,
  getPropertiesWithBookings,
  type BookingWithDetails,
  type PropertyWithBookings,
} from '@/lib/queries/bookings';
import { createClientComponentClient } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function formatCurrency(amount: number) {
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getPropertyName(apartment: BookingWithDetails['apartments']) {
  if (!apartment) return 'Unknown property';
  return apartment.uplisting_name || apartment.apartment_number;
}

function getStatusBadgeClass(status: string) {
  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    completed: 'bg-green-100 text-green-800 border-green-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  return statusColors[status] ?? 'bg-gray-100 text-gray-800 border-gray-200';
}

function getChannelBadgeClass(channelName: string) {
  const normalized = channelName.toLowerCase();

  if (normalized.includes('airbnb')) {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }
  if (normalized.includes('booking')) {
    return 'bg-sky-100 text-sky-800 border-sky-200';
  }
  if (normalized.includes('vrbo') || normalized.includes('homeaway')) {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  if (normalized.includes('direct') || normalized.includes('uplisting')) {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
  if (normalized.includes('expedia')) {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }

  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function BookingsContent() {
  const [apartments, setApartments] = useState<PropertyWithBookings[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [showCancelled, setShowCancelled] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClientComponentClient();
      const properties = await getPropertiesWithBookings(supabase);
      setApartments(properties);

      if (properties.length === 0) {
        setBookings([]);
        return;
      }

      const propertyIds = new Set(properties.map((property) => property.id));
      const data = await getBookingsWithDetails(supabase, {
        fromDate: getTodayIsoDate(),
        includeCancel: showCancelled,
        ...(selectedPropertyId !== 'all' ? { apartmentId: selectedPropertyId } : {}),
      });

      const visibleBookings =
        selectedPropertyId === 'all'
          ? data.filter(
              (booking) =>
                booking.apartment_id != null && propertyIds.has(booking.apartment_id)
            )
          : data;

      setBookings(visibleBookings);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bookings';
      toast.error(message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPropertyId, showCancelled]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const visibleCount = bookings.length;

  const summaryText = useMemo(() => {
    const propertyLabel =
      selectedPropertyId === 'all'
        ? 'all linked properties'
        : apartments.find((apt) => apt.id === selectedPropertyId)?.uplisting_name ||
          apartments.find((apt) => apt.id === selectedPropertyId)?.apartment_number ||
          'selected property';

    return `${visibleCount} upcoming booking${visibleCount === 1 ? '' : 's'} for ${propertyLabel}`;
  }, [apartments, selectedPropertyId, visibleCount]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-blue-600" />
              Bookings
            </h1>
            <p className="text-gray-600 mt-2">
              Upcoming reservations synced from Uplisting-linked properties
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="property-filter">Property</Label>
                <Select
                  value={selectedPropertyId}
                  onValueChange={setSelectedPropertyId}
                >
                  <SelectTrigger id="property-filter">
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All properties</SelectItem>
                    {apartments.map((apartment) => (
                      <SelectItem key={apartment.id} value={apartment.id}>
                        {apartment.uplisting_name || apartment.apartment_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 w-full">
                  <Switch
                    id="show-cancelled"
                    checked={showCancelled}
                    onCheckedChange={setShowCancelled}
                  />
                  <Label htmlFor="show-cancelled" className="cursor-pointer">
                    Show cancelled bookings
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-gray-600 mb-4">{summaryText}</p>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-2 text-gray-600">Loading bookings...</span>
          </div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              No upcoming bookings found for the current filters.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Property
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Guest
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Check-in
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Check-out
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            Nights
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Channel
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            Total payout
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => {
                          const channelName =
                            booking.booking_channels?.name ?? 'Unknown';

                          return (
                            <tr
                              key={booking.id}
                              className="border-b last:border-b-0 hover:bg-gray-50"
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">
                                  {getPropertyName(booking.apartments)}
                                </div>
                                {booking.apartments?.owner_name && (
                                  <div className="text-sm text-gray-500">
                                    {booking.apartments.owner_name}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {booking.guests?.name ?? 'Unknown guest'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDate(booking.check_in_date)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDate(booking.check_out_date)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {booking.nights}
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="outline"
                                  className={getChannelBadgeClass(channelName)}
                                >
                                  {channelName}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge
                                  variant="outline"
                                  className={getStatusBadgeClass(booking.booking_status)}
                                >
                                  {booking.booking_status.charAt(0).toUpperCase() +
                                    booking.booking_status.slice(1)}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-gray-900">
                                {formatCurrency(Number(booking.total_payout ?? 0))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:hidden space-y-4">
              {bookings.map((booking) => {
                const channelName = booking.booking_channels?.name ?? 'Unknown';

                return (
                  <Card key={booking.id}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {getPropertyName(booking.apartments)}
                          </p>
                          {booking.apartments?.owner_name && (
                            <p className="text-sm text-gray-500">
                              {booking.apartments.owner_name}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClass(booking.booking_status)}
                        >
                          {booking.booking_status.charAt(0).toUpperCase() +
                            booking.booking_status.slice(1)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <User className="w-4 h-4 text-gray-400" />
                        {booking.guests?.name ?? 'Unknown guest'}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(booking.check_in_date)} –{' '}
                        {formatDate(booking.check_out_date)} · {booking.nights}{' '}
                        night{booking.nights === 1 ? '' : 's'}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Badge
                          variant="outline"
                          className={getChannelBadgeClass(channelName)}
                        >
                          {channelName}
                        </Badge>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(Number(booking.total_payout ?? 0))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
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

export default function BookingsPage() {
  return (
    <AuthWrapper>
      <BookingsContent />
    </AuthWrapper>
  );
}
