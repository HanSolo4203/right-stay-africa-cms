'use client';

import { useState, useEffect, useMemo } from 'react';
import AuthWrapper from '@/components/AuthWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CSVImportModal from '@/components/ui/CSVImportModal';
import { 
  DollarSign, 
  Calendar, 
  User, 
  Building, 
  FileText, 
  Download, 
  Mail, 
  ChevronDown, 
  ChevronRight,
  Filter,
  RefreshCw,
  Upload,
  Plus,
  Trash2,
  Calculator,
  Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generateOwnerStatementPDF, generateAllOwnerStatementsPDF, OwnerStatementData } from '@/lib/pdf-generator';


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
  upsell_total: number;
  custom_expense_total: number;
  booking_taxes: number;
  channel_commission: number;
  commission_tax: number;
  payment_processing_fee: number;
  net_revenue: number; // Channel-specific payout (what you see on owner statement)
  total_payout: number; // Legacy field
  booking_status: string;
  booking_date: string;
  booking_notes?: string;
}

interface PropertyGroup {
  property_name: string;
  owner_name: string;
  owner_email: string;
  bookings: Booking[];
  totals: {
    nights: number;
    accommodation_total: number;
    discount_amount: number;
    extra_charges: number;
    cleaning_fee: number;
    upsell_total: number;
    custom_expense_total: number;
    booking_taxes: number;
    channel_commission: number;
    commission_tax: number;
    payment_processing_fee: number;
    net_revenue: number; // What RightStay receives (channel-specific)
    total_payout: number; // Legacy
    booking_count: number;
  };
}

interface BookingData {
  properties: PropertyGroup[];
  grandTotals: {
    nights: number;
    accommodation_total: number;
    discount_amount: number;
    extra_charges: number;
    cleaning_fee: number;
    upsell_total: number;
    custom_expense_total: number;
    booking_taxes: number;
    channel_commission: number;
    commission_tax: number;
    payment_processing_fee: number;
    net_revenue: number; // What RightStay receives
    total_payout: number; // Legacy
    booking_count: number;
  };
}

interface FilterOptions {
  apartments: Array<{ id: string; apartment_number: string; owner_name: string }>;
  channels: Array<{ id: string; name: string; commission_rate: number; payment_processing_fee: number }>;
  statusOptions: Array<{ value: string; label: string }>;
}

function OwnerStatementsContent() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState<string>('this_month');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    apartmentId: '',
    channelId: '',
    status: ''
  });
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [propertyExpenses, setPropertyExpenses] = useState<{ [key: string]: Array<{ name: string; quantity: number; price: number }> }>({});
  const [rightStayCommissionRate, setRightStayCommissionRate] = useState<{ [key: string]: number }>({});
  const [savingExpenses, setSavingExpenses] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  
  // Helper function to format date as YYYY-MM-DD in local timezone (not UTC)
  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get statement date (last day of current filter period or current month)
  const getStatementDate = () => {
    if (filters.endDate) return filters.endDate;
    const date = new Date();
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return formatDateLocal(lastDayOfMonth); // Last day of current month in local timezone
  };

  // Load saved expenses when booking data loads (only once)
  useEffect(() => {
    const loadExpenses = async () => {
      if (bookingData?.properties && !expensesLoaded) {
        try {
          // Get date range for expense loading
          const today = new Date();
          const startDate = filters.startDate || formatDateLocal(new Date(today.getFullYear(), today.getMonth(), 1));
          const endDate = filters.endDate || formatDateLocal(today);
          
          // Load expenses for the entire date range
          const response = await fetch(`/api/owner-statements/expenses?start_date=${startDate}&end_date=${endDate}`);
          const result = await response.json();

          if (result.success && result.data.length > 0) {
            // Aggregate expenses across all months in the date range
            const aggregatedExpenses: { [key: string]: Array<{ name: string; quantity: number; price: number }> } = {};
            const loadedRates: { [key: string]: number } = {};

            interface SavedExpenseItem {
              property_name: string;
              commission_rate?: number;
              expenses?: Array<{ name: string; quantity: number; price: number }>;
            }

            // Group expenses by property and aggregate them
            result.data.forEach((item: SavedExpenseItem) => {
              if (!aggregatedExpenses[item.property_name]) {
                aggregatedExpenses[item.property_name] = [];
                loadedRates[item.property_name] = item.commission_rate || 0;
              }
              
              // Add expenses from this month to the aggregated list
              if (item.expenses && Array.isArray(item.expenses)) {
                item.expenses.forEach((expense: { name: string; quantity: number; price: number }) => {
                  // Check if this expense type already exists
                  const existingExpense = aggregatedExpenses[item.property_name].find(
                    e => e.name === expense.name && e.price === expense.price
                  );
                  
                  if (existingExpense) {
                    // Add quantities together
                    existingExpense.quantity += expense.quantity;
                  } else {
                    // Add new expense
                    aggregatedExpenses[item.property_name].push({
                      name: expense.name,
                      quantity: expense.quantity,
                      price: expense.price
                    });
                  }
                });
              }
            });

            setPropertyExpenses(aggregatedExpenses);
            setRightStayCommissionRate(loadedRates);
            setExpensesLoaded(true);
          } else {
            // Auto-populate cleaning fees if no saved data
            const newExpenses: { [key: string]: Array<{ name: string; quantity: number; price: number }> } = {};
            
            bookingData.properties.forEach(property => {
              const totalCleaningFee = property.totals.cleaning_fee;
              const bookingCount = property.totals.booking_count;
              
              if (totalCleaningFee > 0) {
                newExpenses[property.property_name] = [
                  { name: 'Cleaning Fees (from bookings)', quantity: bookingCount, price: totalCleaningFee / bookingCount }
                ];
              }
            });
            
            setPropertyExpenses(newExpenses);
            setExpensesLoaded(true);
          }
        } catch (error) {
          console.error('Error loading expenses:', error);
          // Fallback to auto-populate cleaning fees
          const newExpenses: { [key: string]: Array<{ name: string; quantity: number; price: number }> } = {};
          
          bookingData.properties.forEach(property => {
            const totalCleaningFee = property.totals.cleaning_fee;
            const bookingCount = property.totals.booking_count;
            
            if (totalCleaningFee > 0) {
              newExpenses[property.property_name] = [
                { name: 'Cleaning Fees (from bookings)', quantity: bookingCount, price: totalCleaningFee / bookingCount }
              ];
            }
          });
          
          setPropertyExpenses(newExpenses);
          setExpensesLoaded(true);
        }
      }
    };

    loadExpenses();
  }, [bookingData, expensesLoaded, filters.startDate, filters.endDate]);

  // Reset expensesLoaded when filters change to reload for new period
  useEffect(() => {
    setExpensesLoaded(false);
  }, [filters.endDate, filters.startDate]);

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

        // Fetch booking data
        const params = new URLSearchParams();
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.apartmentId) params.append('apartmentId', filters.apartmentId);
        if (filters.channelId) params.append('channelId', filters.channelId);
        if (filters.status) params.append('status', filters.status);

        const bookingsResponse = await fetch(`/api/bookings?${params.toString()}`);
        const bookingsResult = await bookingsResponse.json();
        
        if (bookingsResult.success) {
          setBookingData(bookingsResult.data);
        } else {
          toast.error('Failed to load booking data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge variant="default" className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const togglePropertyExpansion = (propertyName: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyName)) {
      newExpanded.delete(propertyName);
    } else {
      newExpanded.add(propertyName);
    }
    setExpandedProperties(newExpanded);
  };

  const handleFilterChange = (key: string, value: string) => {
    // Convert "all" values to empty strings for API calls
    const filterValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [key]: filterValue }));
  };

  // Quick filter helpers (this_month, last_month, this_year, last_year, custom)
  // Always returns first day to last day of the selected month
  const getDateRanges = (filter: string) => {
    const today = new Date();
    let currentStart: Date, currentEnd: Date;

    switch (filter) {
      case 'this_month':
        // First day of current month
        currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
        // Last day of current month (next month's 0th day = last day of current month)
        currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last_month':
        // First day of last month
        currentStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        // Last day of last month (current month's 0th day = last day of previous month)
        currentEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'this_year':
        // January 1st
        currentStart = new Date(today.getFullYear(), 0, 1);
        // December 31st
        currentEnd = new Date(today.getFullYear(), 11, 31);
        break;
      case 'last_year':
        // January 1st of last year
        currentStart = new Date(today.getFullYear() - 1, 0, 1);
        // December 31st of last year
        currentEnd = new Date(today.getFullYear() - 1, 11, 31);
        break;
      default:
        return null;
    }

    return {
      start: formatDateLocal(currentStart),
      end: formatDateLocal(currentEnd)
    };
  };

  const handleQuickFilterChange = (value: string) => {
    setQuickFilter(value);
    if (value !== 'custom') {
      const range = getDateRanges(value);
      if (range) {
        setFilters(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
      }
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    // The useEffect will automatically refetch data when filters change
  };

  // Default to current month on first load
  useEffect(() => {
    if (!filters.startDate && !filters.endDate) {
      handleQuickFilterChange('this_month');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadPDF = async (propertyName: string) => {
    try {
      toast.loading(`Generating PDF for ${propertyName}...`);
      
      // Find the property data
      const property = bookingData?.properties.find(p => p.property_name === propertyName);
      if (!property) {
        toast.error('Property data not found');
        return;
      }
      
      // Get expenses for this property
      const propertyExpensesList = propertyExpenses[propertyName] || [];
      const totalExpenses = propertyExpensesList.reduce((sum, expense) => sum + (expense.quantity * expense.price), 0);
      
      // Get commission rate for this property
      const commissionRate = rightStayCommissionRate[propertyName] || 0;
      const rightStayCommission = (property.totals.net_revenue * commissionRate) / 100;
      
      // Calculate final owner payout
      const finalOwnerPayout = property.totals.net_revenue - rightStayCommission - totalExpenses;
      
      // Prepare PDF data
      const pdfData: OwnerStatementData = {
        propertyName: property.property_name,
        ownerName: property.owner_name,
        ownerEmail: property.owner_email,
        statementDate: filters.endDate || formatDateLocal(new Date()),
        bookings: property.bookings.map(booking => ({
          booking_reference: booking.booking_reference,
          guest_name: booking.guest_name,
          channel_name: booking.channel_name,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          nights: booking.nights,
          accommodation_total: booking.accommodation_total,
          channel_commission: booking.channel_commission,
          payment_processing_fee: booking.payment_processing_fee,
          commission_tax: booking.commission_tax,
          net_revenue: booking.net_revenue,
          booking_status: booking.booking_status
        })),
        totals: {
          gross_revenue: property.totals.accommodation_total + property.totals.cleaning_fee + property.totals.extra_charges + property.totals.discount_amount + property.totals.booking_taxes,
          net_revenue: property.totals.net_revenue,
          total_commission: property.totals.channel_commission,
          total_processing_fee: property.totals.payment_processing_fee,
          total_commission_tax: property.totals.commission_tax,
          booking_count: property.totals.booking_count
        },
        expenses: propertyExpensesList.map(expense => ({
          name: expense.name,
          quantity: expense.quantity,
          price: expense.price,
          total: expense.quantity * expense.price
        })),
        totalExpenses,
        rightStayCommission,
        rightStayCommissionRate: commissionRate,
        finalOwnerPayout
      };
      
      await generateOwnerStatementPDF(pdfData);
      toast.success(`PDF generated for ${propertyName}`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleEmailOwner = (ownerEmail: string, propertyName: string) => {
    toast.success(`Sending statement to ${ownerEmail} for ${propertyName}...`);
    // Implement email sending logic here
  };

  const handleExportAll = async () => {
    try {
      if (!bookingData?.properties || bookingData.properties.length === 0) {
        toast.error('No data to export');
        return;
      }
      
      toast.loading('Generating PDFs for all properties...');
      
      const allPropertiesData: OwnerStatementData[] = bookingData.properties.map(property => {
        const propertyExpensesList = propertyExpenses[property.property_name] || [];
        const totalExpenses = propertyExpensesList.reduce((sum, expense) => sum + (expense.quantity * expense.price), 0);
        const commissionRate = rightStayCommissionRate[property.property_name] || 0;
        const rightStayCommission = (property.totals.net_revenue * commissionRate) / 100;
        const finalOwnerPayout = property.totals.net_revenue - rightStayCommission - totalExpenses;
        
        return {
          propertyName: property.property_name,
          ownerName: property.owner_name,
          ownerEmail: property.owner_email,
          statementDate: filters.endDate || formatDateLocal(new Date()),
          bookings: property.bookings.map(booking => ({
            booking_reference: booking.booking_reference,
            guest_name: booking.guest_name,
            channel_name: booking.channel_name,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            nights: booking.nights,
            accommodation_total: booking.accommodation_total,
            channel_commission: booking.channel_commission,
            payment_processing_fee: booking.payment_processing_fee,
            commission_tax: booking.commission_tax,
            net_revenue: booking.net_revenue,
            booking_status: booking.booking_status
          })),
          totals: {
            gross_revenue: property.totals.accommodation_total + property.totals.cleaning_fee + property.totals.extra_charges + property.totals.discount_amount + property.totals.booking_taxes,
            net_revenue: property.totals.net_revenue,
            total_commission: property.totals.channel_commission,
            total_processing_fee: property.totals.payment_processing_fee,
            total_commission_tax: property.totals.commission_tax,
            booking_count: property.totals.booking_count
          },
          expenses: propertyExpensesList.map(expense => ({
            name: expense.name,
            quantity: expense.quantity,
            price: expense.price,
            total: expense.quantity * expense.price
          })),
          totalExpenses,
          rightStayCommission,
          rightStayCommissionRate: commissionRate,
          finalOwnerPayout
        };
      });
      
      await generateAllOwnerStatementsPDF(allPropertiesData);
      toast.success(`Generated ${allPropertiesData.length} PDF files`);
      
    } catch (error) {
      console.error('Error generating PDFs:', error);
      toast.error('Failed to generate PDFs');
    }
  };

  const handleImportComplete = () => {
    // Refresh the data after import
    setLoading(true);
    // The useEffect will automatically refetch
  };

  const handleSaveExpenses = async () => {
    setSavingExpenses(true);
    try {
      // Use the end date of the current filter range, or current month end if no range
      const statementDate = filters.endDate || getStatementDate();
      
      const response = await fetch('/api/owner-statements/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_expenses: propertyExpenses,
          commission_rates: rightStayCommissionRate,
          statement_date: statementDate
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Expenses and commission rates saved successfully');
      } else {
        toast.error('Failed to save expenses');
      }
    } catch (error) {
      console.error('Error saving expenses:', error);
      toast.error('Failed to save expenses');
    } finally {
      setSavingExpenses(false);
    }
  };

  // Expense management functions
  const addExpense = (propertyName: string) => {
    setPropertyExpenses(prev => ({
      ...prev,
      [propertyName]: [...(prev[propertyName] || []), { name: '', quantity: 1, price: 0 }]
    }));
  };

  const updateExpense = (propertyName: string, index: number, field: 'name' | 'quantity' | 'price', value: string | number) => {
    setPropertyExpenses(prev => {
      const expenses = [...(prev[propertyName] || [])];
      expenses[index] = { ...expenses[index], [field]: value };
      return { ...prev, [propertyName]: expenses };
    });
  };

  const removeExpense = (propertyName: string, index: number) => {
    setPropertyExpenses(prev => {
      const expenses = [...(prev[propertyName] || [])];
      expenses.splice(index, 1);
      return { ...prev, [propertyName]: expenses };
    });
  };

  const updateCommissionRate = (propertyName: string, rate: number) => {
    setRightStayCommissionRate(prev => ({
      ...prev,
      [propertyName]: rate
    }));
  };

  // Memoized calculations that update when dependencies change
  const propertyCalculations = useMemo(() => {
    const calculations: { [key: string]: { totalExpenses: number; commission: number; ownerPayout: number } } = {};
    
    if (bookingData?.properties) {
      bookingData.properties.forEach(property => {
        const propertyName = property.property_name;
        const netRevenue = property.totals.net_revenue;
        
        // Calculate total expenses
        const expenses = propertyExpenses[propertyName] || [];
        const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.quantity * expense.price), 0);
        
        // Calculate RightStay commission
        const rate = rightStayCommissionRate[propertyName] || 0;
        const commission = (netRevenue * rate) / 100;
        
        // Calculate final owner payout
        const ownerPayout = netRevenue - totalExpenses - commission;
        
        calculations[propertyName] = { totalExpenses, commission, ownerPayout };
      });
    }
    
    return calculations;
  }, [bookingData, propertyExpenses, rightStayCommissionRate]);

  // Helper functions to access memoized calculations
  const calculateTotalExpenses = (propertyName: string): number => {
    return propertyCalculations[propertyName]?.totalExpenses || 0;
  };

  const calculateRightStayCommission = (propertyName: string): number => {
    return propertyCalculations[propertyName]?.commission || 0;
  };

  const calculateOwnerPayout = (propertyName: string): number => {
    return propertyCalculations[propertyName]?.ownerPayout || 0;
  };


  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Owner Statements</h1>
              <p className="text-gray-600">Comprehensive booking and financial statements</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleRefresh} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowImportModal(true)} variant="default">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button onClick={handleSaveExpenses} disabled={savingExpenses} variant="default">
              <Save className={`h-4 w-4 mr-2 ${savingExpenses ? 'animate-pulse' : ''}`} />
              {savingExpenses ? 'Saving...' : 'Save Expenses'}
            </Button>
            <Button onClick={handleExportAll} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                  onChange={(e) => { handleFilterChange('startDate', e.target.value); setQuickFilter('custom'); }}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => { handleFilterChange('endDate', e.target.value); setQuickFilter('custom'); }}
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
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {filterOptions?.statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      {bookingData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingData.grandTotals.booking_count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(bookingData.grandTotals.accommodation_total)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(bookingData.grandTotals.net_revenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookingData.properties.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Properties List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : bookingData && bookingData.properties.length > 0 ? (
          bookingData.properties.map((property) => (
            <Card key={property.property_name}>
              <CardHeader>
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-6 px-6 py-2 rounded-md"
                      onClick={() => togglePropertyExpansion(property.property_name)}
                    >
                      <div className="flex items-center space-x-4">
                        {expandedProperties.has(property.property_name) ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <div>
                          <CardTitle className="text-xl">{property.property_name}</CardTitle>
                          <CardDescription>
                            {property.owner_name} • {property.owner_email}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-right">
                        <div>
                          <div className="text-sm text-gray-500">Net Revenue</div>
                          <div className="text-lg font-bold">{formatCurrency(property.totals.net_revenue)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Bookings</div>
                          <div className="text-lg font-bold">{property.totals.booking_count}</div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(property.property_name);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailOwner(property.owner_email, property.property_name);
                            }}
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-6 space-y-6">
                      {/* Property Totals Summary */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Property Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Total Nights</div>
                            <div className="font-medium">{property.totals.nights}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Gross Revenue</div>
                            <div className="font-medium">{formatCurrency(property.totals.accommodation_total + property.totals.cleaning_fee + property.totals.extra_charges + property.totals.discount_amount + property.totals.booking_taxes)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Cleaning Fees</div>
                            <div className="font-medium">{formatCurrency(property.totals.cleaning_fee)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Channel Commission</div>
                            <div className="font-medium text-red-600">-{formatCurrency(property.totals.channel_commission)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Booking Fees</div>
                            <div className="font-medium text-red-600">-{formatCurrency(property.totals.commission_tax + property.totals.payment_processing_fee)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Net Revenue</div>
                            <div className="font-medium text-green-600">{formatCurrency(property.totals.net_revenue)}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Total Mgmt Fee</div>
                            <div className="font-medium text-blue-600">-{formatCurrency(calculateRightStayCommission(property.property_name))}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Bookings Payout</div>
                            <div className="font-bold text-green-700">{formatCurrency(property.totals.net_revenue - calculateRightStayCommission(property.property_name))}</div>
                          </div>
                        </div>
                      </div>

                      {/* Detailed Bookings Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Booking Ref</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Guest</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Channel</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Check-in</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Check-out</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Nights</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Accommodation</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Discount</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Extra Charges</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Cleaning</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Upsells</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Taxes</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Commission</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Processing</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Comm. Tax</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Mgmt Fee</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Bookings Payout</th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {property.bookings.map((booking) => (
                              <tr key={booking.booking_id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-mono text-sm">{booking.booking_reference}</td>
                                <td className="py-3 px-4">
                                  <div>
                                    <div className="font-medium">{booking.guest_name}</div>
                                    <div className="text-sm text-gray-500">{booking.guest_email}</div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">{booking.channel_name}</td>
                                <td className="py-3 px-4">{formatDate(booking.check_in_date)}</td>
                                <td className="py-3 px-4">{formatDate(booking.check_out_date)}</td>
                                <td className="py-3 px-4 text-center">{booking.nights}</td>
                                <td className="py-3 px-4">{formatCurrency(booking.accommodation_total)}</td>
                                <td className="py-3 px-4">{formatCurrency(booking.discount_amount)}</td>
                                <td className="py-3 px-4">{formatCurrency(booking.extra_charges)}</td>
                                <td className="py-3 px-4">{formatCurrency(booking.cleaning_fee)}</td>
                                <td className="py-3 px-4">{formatCurrency(booking.upsell_total)}</td>
                                <td className="py-3 px-4">{formatCurrency(booking.booking_taxes)}</td>
                                <td className="py-3 px-4 text-red-600">{formatCurrency(booking.channel_commission)}</td>
                                <td className="py-3 px-4 text-red-600">{formatCurrency(booking.commission_tax)}</td>
                                <td className="py-3 px-4 text-red-600">{formatCurrency(booking.payment_processing_fee)}</td>
                                <td className="py-3 px-4 text-blue-600">
                                  {formatCurrency((booking.net_revenue * (rightStayCommissionRate[property.property_name] || 0)) / 100)}
                                </td>
                                <td className="py-3 px-4 font-medium text-green-600">
                                  {formatCurrency(booking.net_revenue - ((booking.net_revenue * (rightStayCommissionRate[property.property_name] || 0)) / 100))}
                                </td>
                                <td className="py-3 px-4">{getStatusBadge(booking.booking_status)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Expenses & Owner Payout Section */}
                      <div className="mt-6 space-y-4">
                        {/* RightStay Commission Rate */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label className="font-semibold text-blue-900">RightStay Africa Commission</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={rightStayCommissionRate[property.property_name] || 0}
                                onChange={(e) => updateCommissionRate(property.property_name, parseFloat(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                              <span className="text-sm font-medium">% of Net Revenue</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            Commission: {formatCurrency(calculateRightStayCommission(property.property_name))}
                          </div>
                        </div>

                        {/* Property Expenses */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">Additional Expenses</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addExpense(property.property_name)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Expense
                            </Button>
                          </div>

                          {(propertyExpenses[property.property_name] || []).length > 0 ? (
                            <div className="space-y-2">
                              {(propertyExpenses[property.property_name] || []).map((expense, index) => (
                                <div key={index} className="flex items-center gap-2 bg-white p-2 rounded">
                                  <Input
                                    placeholder="Expense name"
                                    value={expense.name}
                                    onChange={(e) => updateExpense(property.property_name, index, 'name', e.target.value)}
                                    className="flex-1"
                                  />
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="Qty"
                                    value={expense.quantity}
                                    onChange={(e) => updateExpense(property.property_name, index, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-20"
                                  />
                                  <span className="text-gray-500">×</span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Price"
                                    value={expense.price}
                                    onChange={(e) => updateExpense(property.property_name, index, 'price', parseFloat(e.target.value) || 0)}
                                    className="w-28"
                                  />
                                  <span className="text-gray-500">=</span>
                                  <div className="w-32 text-right font-medium">
                                    {formatCurrency(expense.quantity * expense.price)}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeExpense(property.property_name, index)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              ))}
                              <div className="flex justify-end pt-2 border-t">
                                <div className="text-right">
                                  <div className="text-sm text-gray-500">Total Expenses</div>
                                  <div className="text-lg font-bold">{formatCurrency(calculateTotalExpenses(property.property_name))}</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No additional expenses added. Click &quot;Add Expense&quot; to include cleaning fees, welcome packs, etc.
                            </div>
                          )}
                        </div>

                        {/* Final Owner Payout Calculation */}
                        <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Calculator className="h-5 w-5 text-green-700" />
                            <h4 className="font-semibold text-green-900">Final Owner Payout</h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-700">Net Revenue (from bookings):</span>
                              <span className="font-medium">{formatCurrency(property.totals.net_revenue)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Less: Additional Expenses:</span>
                              <span className="font-medium">-{formatCurrency(calculateTotalExpenses(property.property_name))}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Less: RightStay Commission ({rightStayCommissionRate[property.property_name] || 0}%):</span>
                              <span className="font-medium">-{formatCurrency(calculateRightStayCommission(property.property_name))}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t-2 border-green-300">
                              <span className="font-bold text-green-900 text-lg">Final Owner Payout:</span>
                              <span className="font-bold text-green-700 text-xl">{formatCurrency(calculateOwnerPayout(property.property_name))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-500">Try adjusting your filters or check back later.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CSV Import Modal */}
      <CSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}

export default function OwnerStatementsPage() {
  return (
    <AuthWrapper>
      <OwnerStatementsContent />
    </AuthWrapper>
  );
}
