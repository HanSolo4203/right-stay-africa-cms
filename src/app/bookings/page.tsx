'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Booking {
  booking_id: string;
  booking_reference: string;
  property_name: string;
  owner_name: string;
  owner_email: string;
  guest_name: string;
  guest_email: string;
  channel_name: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  accommodation_total: number;
  discount_amount: number;
  extra_charges: number;
  cleaning_fee: number;
  booking_taxes: number;
  channel_commission: number;
  payment_processing_fee: number;
  commission_tax: number;
  booking_status: string;
  booking_date: string;
  booking_notes: string;
  upsell_total: number;
  custom_expense_total: number;
  gross_revenue: number;
  net_revenue: number;
  total_payout: number;
  preliminary_owner_payout: number;
}

interface BookingFilters {
  startDate: string;
  endDate: string;
  propertyId: string;
  channelId: string;
  status: string;
  searchTerm: string;
}

type SortField = 'booking_reference' | 'check_in_date' | 'check_out_date' | 'booking_date' | 'property_name' | 'guest_name' | 'channel_name' | 'accommodation_total' | 'net_revenue' | 'booking_status' | 'nights';
type SortDirection = 'asc' | 'desc';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BookingFilters>({
    startDate: '',
    endDate: '',
    propertyId: '',
    channelId: '',
    status: '',
    searchTerm: ''
  });
  const [sortField, setSortField] = useState<SortField>('check_in_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterOptions, setFilterOptions] = useState({
    properties: [] as Array<{ id: string; name: string }>,
    channels: [] as Array<{ id: string; name: string }>,
    statuses: ['confirmed', 'completed', 'cancelled', 'pending']
  });

  // Fetch bookings data
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        if (filters.propertyId) params.append('property_id', filters.propertyId);
        if (filters.channelId) params.append('channel_id', filters.channelId);
        if (filters.status) params.append('status', filters.status);

        const response = await fetch(`/api/bookings/all?${params.toString()}`);
        const result = await response.json();

        console.log('Bookings API response:', result);

        if (result.success) {
          setBookings(result.data || []);
          console.log(`Loaded ${result.data?.length || 0} bookings`);
        } else {
          console.error('Failed to load bookings:', result.error);
          toast.error('Failed to load bookings');
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [filters]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [propertiesResponse, channelsResponse] = await Promise.all([
          fetch('/api/bookings/filters'),
          fetch('/api/booking-channels')
        ]);

        const propertiesResult = await propertiesResponse.json();
        const channelsResult = await channelsResponse.json();

        if (propertiesResult.success) {
          setFilterOptions(prev => ({
            ...prev,
            properties: propertiesResult.data.properties || []
          }));
        }

        if (channelsResult.success) {
          setFilterOptions(prev => ({
            ...prev,
            channels: channelsResult.data || []
          }));
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof BookingFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? '' : value
    }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const filteredAndSortedBookings = bookings
    .filter(booking => {
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          booking.booking_reference.toLowerCase().includes(searchLower) ||
          booking.guest_name.toLowerCase().includes(searchLower) ||
          booking.property_name.toLowerCase().includes(searchLower) ||
          booking.channel_name.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let aValue: string | number = a[sortField];
      let bValue: string | number = b[sortField];

      // Handle date fields
      if (sortField.includes('date')) {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      // Handle numeric fields
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

  const formatCurrency = (amount: number) => 
    `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) => 
    new Date(dateString).toLocaleDateString('en-ZA');

  const getStatusBadge = (status: string) => {
    const statusColors = {
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleRefresh = () => {
    setLoading(true);
    // The useEffect will automatically refetch data when loading state changes
    setTimeout(() => setLoading(false), 100);
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      'Booking Reference', 'Property', 'Guest Name', 'Channel', 'Check-in', 'Check-out',
      'Nights', 'Accommodation', 'Discount', 'Extra Charges', 'Cleaning Fee', 'Taxes',
      'Commission', 'Processing Fee', 'Commission Tax', 'Net Revenue', 'Status'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredAndSortedBookings.map(booking => [
        booking.booking_reference,
        booking.property_name,
        booking.guest_name,
        booking.channel_name,
        booking.check_in_date,
        booking.check_out_date,
        booking.nights,
        booking.accommodation_total,
        booking.discount_amount,
        booking.extra_charges,
        booking.cleaning_fee,
        booking.booking_taxes,
        booking.channel_commission,
        booking.payment_processing_fee,
        booking.commission_tax,
        booking.net_revenue,
        booking.booking_status
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Bookings</h1>
          <p className="text-gray-600">Complete booking records with sorting and filtering</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleRefresh} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExportCSV} variant="default">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="property">Property</Label>
              <Select value={filters.propertyId || 'all'} onValueChange={(value) => handleFilterChange('propertyId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {filterOptions.properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select value={filters.channelId || 'all'} onValueChange={(value) => handleFilterChange('channelId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {filterOptions.channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {filterOptions.statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by booking reference, guest name, property, or channel..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredAndSortedBookings.length} of {bookings.length} bookings
        </p>
        <div className="text-sm text-gray-600">
          Sorted by {sortField.replace('_', ' ')} ({sortDirection})
        </div>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('booking_reference')}
                      className="h-auto p-0 font-semibold"
                    >
                      Booking Ref {getSortIcon('booking_reference')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('property_name')}
                      className="h-auto p-0 font-semibold"
                    >
                      Property {getSortIcon('property_name')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('guest_name')}
                      className="h-auto p-0 font-semibold"
                    >
                      Guest {getSortIcon('guest_name')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('channel_name')}
                      className="h-auto p-0 font-semibold"
                    >
                      Channel {getSortIcon('channel_name')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('check_in_date')}
                      className="h-auto p-0 font-semibold"
                    >
                      Check-in {getSortIcon('check_in_date')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('check_out_date')}
                      className="h-auto p-0 font-semibold"
                    >
                      Check-out {getSortIcon('check_out_date')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('nights')}
                      className="h-auto p-0 font-semibold"
                    >
                      Nights {getSortIcon('nights')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('accommodation_total')}
                      className="h-auto p-0 font-semibold"
                    >
                      Accommodation {getSortIcon('accommodation_total')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('net_revenue')}
                      className="h-auto p-0 font-semibold"
                    >
                      Net Revenue {getSortIcon('net_revenue')}
                    </Button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('booking_status')}
                      className="h-auto p-0 font-semibold"
                    >
                      Status {getSortIcon('booking_status')}
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading bookings...
                    </td>
                  </tr>
                ) : filteredAndSortedBookings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                      No bookings found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedBookings.map((booking) => (
                    <tr key={booking.booking_id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">
                        {booking.booking_reference}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{booking.property_name}</div>
                          <div className="text-sm text-gray-500">{booking.owner_name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{booking.guest_name}</div>
                          <div className="text-sm text-gray-500">{booking.guest_email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{booking.channel_name}</Badge>
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
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(booking.accommodation_total)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {formatCurrency(booking.net_revenue)}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(booking.booking_status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
