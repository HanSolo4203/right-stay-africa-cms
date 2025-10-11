'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Building, 
  PieChart as PieChartIcon,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Users,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Booking {
  booking_id: string;
  booking_reference: string;
  property_name: string;
  owner_name: string;
  channel_name: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  accommodation_total: number;
  channel_commission: number;
  payment_processing_fee: number;
  commission_tax: number;
  net_revenue: number;
  cleaning_fee: number;
  booking_status: string;
}

interface PropertyGroup {
  property_name: string;
  owner_name: string;
  owner_email: string;
  bookings: Booking[];
  totals: {
    nights: number;
    accommodation_total: number;
    channel_commission: number;
    payment_processing_fee: number;
    commission_tax: number;
    net_revenue: number;
    cleaning_fee: number;
    booking_count: number;
  };
}

interface BookingData {
  properties: PropertyGroup[];
  grandTotals: {
    nights: number;
    accommodation_total: number;
    channel_commission: number;
    payment_processing_fee: number;
    commission_tax: number;
    net_revenue: number;
    cleaning_fee: number;
    booking_count: number;
  };
}

interface FilterOptions {
  apartments: Array<{ id: string; apartment_number: string; owner_name: string }>;
  channels: Array<{ id: string; name: string }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function AnalyticsContent() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [previousBookingData, setPreviousBookingData] = useState<BookingData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<string>('this_month');
  const [showOverallStats, setShowOverallStats] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    apartmentId: '',
    channelId: ''
  });

  // Calculate date ranges based on quick filter
  const getDateRanges = (filter: string) => {
    const today = new Date();
    let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

    switch (filter) {
      case 'this_month':
        currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
        currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        previousStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        previousEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'last_month':
        currentStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        currentEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        previousStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        previousEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);
        break;
      case 'this_year':
        currentStart = new Date(today.getFullYear(), 0, 1);
        currentEnd = new Date(today.getFullYear(), 11, 31);
        previousStart = new Date(today.getFullYear() - 1, 0, 1);
        previousEnd = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'last_year':
        currentStart = new Date(today.getFullYear() - 1, 0, 1);
        currentEnd = new Date(today.getFullYear() - 1, 11, 31);
        previousStart = new Date(today.getFullYear() - 2, 0, 1);
        previousEnd = new Date(today.getFullYear() - 2, 11, 31);
        break;
      default: // custom
        return null;
    }

    return {
      current: {
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      },
      previous: {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
      }
    };
  };

  // Fetch booking data and filter options
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch filter options
        const filtersResponse = await fetch('/api/bookings/filters');
        const filtersResult = await filtersResponse.json();
        
        if (filtersResult.success) {
          setFilterOptions(filtersResult.data);
        }

        // Fetch current period booking data
        const params = new URLSearchParams();
        // Only apply date filters if not showing overall stats
        if (!showOverallStats) {
          if (filters.startDate) params.append('startDate', filters.startDate);
          if (filters.endDate) params.append('endDate', filters.endDate);
        }
        if (filters.apartmentId) params.append('apartmentId', filters.apartmentId);
        if (filters.channelId) params.append('channelId', filters.channelId);

        const bookingsResponse = await fetch(`/api/bookings?${params.toString()}`);
        const bookingsResult = await bookingsResponse.json();
        
        if (bookingsResult.success) {
          setBookingData(bookingsResult.data);
        } else {
          toast.error('Failed to load booking data');
        }

        // Fetch previous period data for comparison (only if not showing overall stats)
        if (!showOverallStats && quickFilter !== 'custom') {
          const dateRanges = getDateRanges(quickFilter);
          if (dateRanges) {
            const prevParams = new URLSearchParams();
            prevParams.append('startDate', dateRanges.previous.start);
            prevParams.append('endDate', dateRanges.previous.end);
            if (filters.apartmentId) prevParams.append('apartmentId', filters.apartmentId);
            if (filters.channelId) prevParams.append('channelId', filters.channelId);

            const prevResponse = await fetch(`/api/bookings?${prevParams.toString()}`);
            const prevResult = await prevResponse.json();
            
            if (prevResult.success) {
              setPreviousBookingData(prevResult.data);
            }
          }
        } else {
          setPreviousBookingData(null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, quickFilter, showOverallStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleFilterChange = (key: string, value: string) => {
    const filterValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: filterValue }));
  };

  const handleQuickFilterChange = (value: string) => {
    setQuickFilter(value);
    if (value !== 'custom') {
      const dateRanges = getDateRanges(value);
      if (dateRanges) {
        setFilters(prev => ({
          ...prev,
          startDate: dateRanges.current.start,
          endDate: dateRanges.current.end
        }));
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
  };

  const toggleOverallStats = () => {
    setShowOverallStats(!showOverallStats);
    if (!showOverallStats) {
      // Switching to overall stats - save current filters and clear dates
      setQuickFilter('custom');
    }
  };

  // Calculate percentage change
  const calculateChange = (current: number, previous: number): { value: number; isIncrease: boolean; isNeutral: boolean } => {
    if (previous === 0) return { value: 100, isIncrease: current > 0, isNeutral: current === 0 };
    const change = ((current - previous) / previous) * 100;
    return { 
      value: Math.abs(change), 
      isIncrease: change > 0, 
      isNeutral: Math.abs(change) < 0.01 
    };
  };

  // Get comparison label
  const getComparisonLabel = (filter: string): string => {
    switch (filter) {
      case 'this_month': return 'vs last month';
      case 'last_month': return 'vs previous month';
      case 'this_year': return 'vs last year';
      case 'last_year': return 'vs previous year';
      default: return '';
    }
  };

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (!bookingData) return null;

    // Property Performance
    const propertyPerformance = bookingData.properties.map(prop => ({
      name: prop.property_name,
      revenue: prop.totals.accommodation_total,
      netRevenue: prop.totals.net_revenue,
      bookings: prop.totals.booking_count,
      nights: prop.totals.nights
    })).sort((a, b) => b.revenue - a.revenue);

    // Channel Distribution
    const channelData: { [key: string]: { revenue: number; bookings: number; commission: number } } = {};
    bookingData.properties.forEach(prop => {
      prop.bookings.forEach(booking => {
        if (!channelData[booking.channel_name]) {
          channelData[booking.channel_name] = { revenue: 0, bookings: 0, commission: 0 };
        }
        channelData[booking.channel_name].revenue += booking.accommodation_total;
        channelData[booking.channel_name].bookings += 1;
        channelData[booking.channel_name].commission += booking.channel_commission;
      });
    });

    const channelDistribution = Object.entries(channelData).map(([name, data]) => ({
      name,
      value: data.revenue,
      bookings: data.bookings,
      commission: data.commission
    }));

    // Revenue Breakdown
    const revenueBreakdown = [
      { name: 'Gross Revenue', value: bookingData.grandTotals.accommodation_total, color: '#3b82f6' },
      { name: 'Channel Commission', value: bookingData.grandTotals.channel_commission, color: '#ef4444' },
      { name: 'Processing Fees', value: bookingData.grandTotals.payment_processing_fee, color: '#f59e0b' },
      { name: 'Net Revenue', value: bookingData.grandTotals.net_revenue, color: '#10b981' }
    ];

    // Monthly Trends (group by month)
    const monthlyData: { [key: string]: { revenue: number; bookings: number; nights: number; netRevenue: number } } = {};
    bookingData.properties.forEach(prop => {
      prop.bookings.forEach(booking => {
        const month = new Date(booking.check_in_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, bookings: 0, nights: 0, netRevenue: 0 };
        }
        monthlyData[month].revenue += booking.accommodation_total;
        monthlyData[month].netRevenue += booking.net_revenue;
        monthlyData[month].bookings += 1;
        monthlyData[month].nights += booking.nights;
      });
    });

    const monthlyTrends = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        netRevenue: data.netRevenue,
        bookings: data.bookings,
        nights: data.nights
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    // Top Owners by Revenue
    const ownerData: { [key: string]: { revenue: number; bookings: number; properties: Set<string> } } = {};
    bookingData.properties.forEach(prop => {
      if (!ownerData[prop.owner_name]) {
        ownerData[prop.owner_name] = { revenue: 0, bookings: 0, properties: new Set() };
      }
      ownerData[prop.owner_name].revenue += prop.totals.accommodation_total;
      ownerData[prop.owner_name].bookings += prop.totals.booking_count;
      ownerData[prop.owner_name].properties.add(prop.property_name);
    });

    const topOwners = Object.entries(ownerData)
      .map(([name, data]) => ({
        name: name,
        revenue: data.revenue,
        bookings: data.bookings,
        properties: data.properties.size
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Average Booking Value by Channel
    const avgBookingByChannel = Object.entries(channelData).map(([name, data]) => ({
      name,
      avgValue: data.bookings > 0 ? data.revenue / data.bookings : 0,
      bookings: data.bookings
    })).sort((a, b) => b.avgValue - a.avgValue);

    return {
      propertyPerformance,
      channelDistribution,
      revenueBreakdown,
      monthlyTrends,
      topOwners,
      avgBookingByChannel
    };
  }, [bookingData]);

  // Set default date range to current month
  useEffect(() => {
    if (!filters.startDate && !filters.endDate) {
      handleQuickFilterChange('this_month');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Owner Statements Analytics</h1>
              <p className="text-gray-600">Comprehensive financial insights and performance metrics</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={toggleOverallStats} 
              variant={showOverallStats ? 'default' : 'outline'}
              className={showOverallStats ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Activity className="h-4 w-4 mr-2" />
              {showOverallStats ? 'Show Filtered View' : 'Overall Statistics'}
            </Button>
            <Button onClick={handleRefresh} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {!showOverallStats && (
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="quickFilter">Quick Filter</Label>
                <Select value={quickFilter} onValueChange={handleQuickFilterChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                    <SelectItem value="last_year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    handleFilterChange('startDate', e.target.value);
                    setQuickFilter('custom');
                  }}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    handleFilterChange('endDate', e.target.value);
                    setQuickFilter('custom');
                  }}
                />
              </div>
              <div>
                <Label htmlFor="apartment">Property</Label>
                <Select value={filters.apartmentId || 'all'} onValueChange={(value) => handleFilterChange('apartmentId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {filterOptions?.apartments.map((apt) => (
                      <SelectItem key={apt.id} value={apt.id}>
                        {apt.apartment_number} - {apt.owner_name}
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
                    {filterOptions?.channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Overall Stats Banner */}
      {showOverallStats && (
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-600 text-white p-2 rounded-lg">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-purple-900">Overall Statistics</h3>
                    <p className="text-sm text-purple-700">Showing all-time data across all periods</p>
                  </div>
                </div>
                <Button onClick={toggleOverallStats} variant="outline" size="sm">
                  Back to Filtered View
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Property & Channel Filters - Always Show */}
      {showOverallStats && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Additional Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="apartment-overall">Property</Label>
                  <Select value={filters.apartmentId || 'all'} onValueChange={(value) => handleFilterChange('apartmentId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {filterOptions?.apartments.map((apt) => (
                        <SelectItem key={apt.id} value={apt.id}>
                          {apt.apartment_number} - {apt.owner_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="channel-overall">Channel</Label>
                  <Select value={filters.channelId || 'all'} onValueChange={(value) => handleFilterChange('channelId', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Channels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {filterOptions?.channels.map((channel) => (
                        <SelectItem key={channel.id} value={channel.id}>
                          {channel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : bookingData && analyticsData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(bookingData.grandTotals.accommodation_total)}</div>
                {showOverallStats && (
                  <p className="text-xs text-muted-foreground mt-1">
                    All-time gross revenue
                  </p>
                )}
                {!showOverallStats && previousBookingData && quickFilter !== 'custom' && (
                  <div className="flex items-center mt-2">
                    {(() => {
                      const change = calculateChange(bookingData.grandTotals.accommodation_total, previousBookingData.grandTotals.accommodation_total);
                      return (
                        <div className={`flex items-center text-xs ${change.isNeutral ? 'text-gray-500' : change.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                          {change.isNeutral ? (
                            <Minus className="h-3 w-3 mr-1" />
                          ) : change.isIncrease ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          <span className="font-medium">{change.value.toFixed(1)}%</span>
                          <span className="ml-1 text-muted-foreground">{getComparisonLabel(quickFilter)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {!showOverallStats && (!previousBookingData || quickFilter === 'custom') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Gross revenue from bookings
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(bookingData.grandTotals.net_revenue)}</div>
                {showOverallStats && (
                  <p className="text-xs text-muted-foreground mt-1">
                    All-time net revenue
                  </p>
                )}
                {!showOverallStats && previousBookingData && quickFilter !== 'custom' && (
                  <div className="flex items-center mt-2">
                    {(() => {
                      const change = calculateChange(bookingData.grandTotals.net_revenue, previousBookingData.grandTotals.net_revenue);
                      return (
                        <div className={`flex items-center text-xs ${change.isNeutral ? 'text-gray-500' : change.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                          {change.isNeutral ? (
                            <Minus className="h-3 w-3 mr-1" />
                          ) : change.isIncrease ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          <span className="font-medium">{change.value.toFixed(1)}%</span>
                          <span className="ml-1 text-muted-foreground">{getComparisonLabel(quickFilter)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {!showOverallStats && (!previousBookingData || quickFilter === 'custom') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    After commissions & fees
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bookingData.grandTotals.booking_count}</div>
                {showOverallStats && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {bookingData.grandTotals.nights} all-time nights
                  </p>
                )}
                {!showOverallStats && previousBookingData && quickFilter !== 'custom' && (
                  <div className="flex items-center mt-2">
                    {(() => {
                      const change = calculateChange(bookingData.grandTotals.booking_count, previousBookingData.grandTotals.booking_count);
                      return (
                        <div className={`flex items-center text-xs ${change.isNeutral ? 'text-gray-500' : change.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                          {change.isNeutral ? (
                            <Minus className="h-3 w-3 mr-1" />
                          ) : change.isIncrease ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          <span className="font-medium">{change.value.toFixed(1)}%</span>
                          <span className="ml-1 text-muted-foreground">{getComparisonLabel(quickFilter)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {!showOverallStats && (!previousBookingData || quickFilter === 'custom') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {bookingData.grandTotals.nights} total nights
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Properties</CardTitle>
                <Building className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bookingData.properties.length}</div>
                {showOverallStats && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total properties tracked
                  </p>
                )}
                {!showOverallStats && previousBookingData && quickFilter !== 'custom' && (
                  <div className="flex items-center mt-2">
                    {(() => {
                      const change = calculateChange(bookingData.properties.length, previousBookingData.properties.length);
                      return (
                        <div className={`flex items-center text-xs ${change.isNeutral ? 'text-gray-500' : change.isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                          {change.isNeutral ? (
                            <Minus className="h-3 w-3 mr-1" />
                          ) : change.isIncrease ? (
                            <ArrowUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowDown className="h-3 w-3 mr-1" />
                          )}
                          <span className="font-medium">{change.value.toFixed(1)}%</span>
                          <span className="ml-1 text-muted-foreground">{getComparisonLabel(quickFilter)}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {!showOverallStats && (!previousBookingData || quickFilter === 'custom') && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Generating revenue
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trends Over Time */}
          {analyticsData.monthlyTrends.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                  Revenue Trends Over Time
                </CardTitle>
                <CardDescription>Monthly revenue performance and booking trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analyticsData.monthlyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorNetRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        name="Gross Revenue"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="netRevenue" 
                        stroke="#10b981" 
                        fillOpacity={1} 
                        fill="url(#colorNetRevenue)" 
                        name="Net Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Property Performance and Channel Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Property Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="h-5 w-5 mr-2 text-orange-600" />
                  Top Properties by Revenue
                </CardTitle>
                <CardDescription>Property performance comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.propertyPerformance.slice(0, 10)} margin={{ top: 10, right: 10, left: 10, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        fontSize={9}
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Gross Revenue' : 'Net Revenue']}
                        labelFormatter={(label) => label}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Gross Revenue" />
                      <Bar dataKey="netRevenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Net Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Channel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Revenue by Channel
                </CardTitle>
                <CardDescription>Distribution across booking platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData.channelDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${formatCurrency(entry.value as number)}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analyticsData.channelDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Owners and Avg Booking Value */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top Owners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Top Owners by Revenue
                </CardTitle>
                <CardDescription>Owner performance rankings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.topOwners} layout="vertical" margin={{ top: 10, right: 30, left: 120, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={9} width={110} interval={0} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => label}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                      />
                      <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Average Booking Value by Channel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-indigo-600" />
                  Avg Booking Value by Channel
                </CardTitle>
                <CardDescription>Average revenue per booking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.avgBookingByChannel} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280" 
                        fontSize={10}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'avgValue') return [formatCurrency(value), 'Avg Booking Value'];
                          return [value, 'Total Bookings'];
                        }}
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                      />
                      <Legend />
                      <Bar dataKey="avgValue" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Booking Value">
                        {analyticsData.avgBookingByChannel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown Pie Chart */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                Revenue Breakdown
              </CardTitle>
              <CardDescription>How gross revenue flows to net revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={(entry) => `${entry.name}: ${formatCurrency(entry.value as number)}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analyticsData.revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Metrics Table */}
          {analyticsData.monthlyTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Metrics</CardTitle>
                <CardDescription>Detailed monthly breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Month</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Bookings</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Nights</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Gross Revenue</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Net Revenue</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Avg/Booking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.monthlyTrends.map((month, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{month.month}</td>
                          <td className="py-3 px-4 text-right">{month.bookings}</td>
                          <td className="py-3 px-4 text-right">{month.nights}</td>
                          <td className="py-3 px-4 text-right font-medium text-blue-600">
                            {formatCurrency(month.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">
                            {formatCurrency(month.netRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(month.bookings > 0 ? month.revenue / month.bookings : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
              <p className="text-gray-500">Adjust your filters or check back later.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AuthWrapper>
      <AnalyticsContent />
    </AuthWrapper>
  );
}

