'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  CheckCircle, 
  Printer,
  Calendar,
  Receipt,
  Eye,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AuthWrapper from '@/components/AuthWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invoice } from '@/lib/types';
import { generateInvoicePDF } from '@/lib/pdf-generator';

function InvoiceViewContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showInvoiceList, setShowInvoiceList] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Unwrap the params Promise using React.use()
  const { id } = use(params);

  useEffect(() => {
    loadInvoice();
    loadAllInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${id}`);
      if (response.ok) {
        const data = await response.json();
        setInvoice(data.data);
      } else {
        toast.error('Failed to load invoice');
        router.push('/finance/invoicing');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
      router.push('/finance/invoicing');
    } finally {
      setLoading(false);
    }
  };

  const loadAllInvoices = async () => {
    try {
      const response = await fetch('/api/invoices');
      if (response.ok) {
        const data = await response.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };

  const handleMarkAsSent = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/mark-sent`, {
        method: 'POST',
      });
      
      if (response.ok) {
        toast.success('Invoice marked as sent');
        loadInvoice();
      } else {
        toast.error('Failed to mark invoice as sent');
      }
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      toast.error('Failed to mark invoice as sent');
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount_paid: null }),
      });
      
      if (response.ok) {
        toast.success('Invoice marked as paid');
        loadInvoice();
      } else {
        toast.error('Failed to mark invoice as paid');
      }
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Edit },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: Calendar },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: Receipt },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA');
  };

  // Filter and sort invoices
  const filteredAndSortedInvoices = invoices
    .filter(inv => {
      // Exclude current invoice
      if (inv.id === id) return false;
      
      // Filter by status
      if (statusFilter === 'all') return true;
      if (statusFilter === 'unpaid') {
        return inv.status !== 'paid' && inv.balance_due > 0;
      }
      return inv.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const aDate = new Date(a.invoice_date).getTime();
        const bDate = new Date(b.invoice_date).getTime();
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      } else {
        // Sort by amount
        return sortDirection === 'asc' 
          ? a.total_amount - b.total_amount 
          : b.total_amount - a.total_amount;
      }
    });

  const handlePrint = () => {
    window.print();
  };

  const handleViewPDF = async () => {
    if (!invoice || isGeneratingPDF) return;
    
    try {
      setIsGeneratingPDF(true);
      toast.loading('Generating PDF...');
      await generateInvoicePDF(invoice);
      toast.dismiss();
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice not found</h1>
          <Button onClick={() => router.push('/finance/invoicing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Invoice List Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="lg:sticky lg:top-8">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Receipt className="h-5 w-5" />
                    Other Invoices
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setShowInvoiceList(!showInvoiceList)}
                  >
                    {showInvoiceList ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={`space-y-4 ${showInvoiceList ? 'block' : 'hidden lg:block'}`}>
                {/* Filters */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter by Status
                    </Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort By
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={sortBy} onValueChange={(value: 'date' | 'amount') => setSortBy(value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      >
                        {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Invoice List */}
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-3">
                    {filteredAndSortedInvoices.length} invoice{filteredAndSortedInvoices.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                    {filteredAndSortedInvoices.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No other invoices found
                      </p>
                    ) : (
                      filteredAndSortedInvoices.map((inv) => (
                        <div
                          key={inv.id}
                          onClick={() => {
                            router.push(`/finance/invoicing/${inv.id}`);
                            setShowInvoiceList(false); // Close on mobile after selection
                          }}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors touch-manipulation ${
                            inv.id === id
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200 hover:bg-gray-50 active:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">{inv.invoice_number}</p>
                              <p className="text-xs text-gray-600 mt-1 truncate">
                                {inv.client_prefix ? `${inv.client_prefix} ` : ''}{inv.client_name}
                              </p>
                            </div>
                            <div className="flex-shrink-0">
                              {getStatusBadge(inv.status)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2 text-xs gap-2">
                            <div className="flex items-center gap-1 text-gray-600 flex-shrink-0">
                              <Calendar className="h-3 w-3" />
                              <span className="whitespace-nowrap">{formatDate(inv.invoice_date)}</span>
                            </div>
                            <span className="font-medium text-gray-900 truncate">
                              {formatCurrency(inv.total_amount)}
                            </span>
                          </div>
                          {inv.balance_due > 0 && (
                            <p className="text-xs text-red-600 mt-1 truncate">
                              Balance: {formatCurrency(inv.balance_due)}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Invoice Content */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {/* Header */}
            <div className="mb-4 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/finance/invoicing')}
                    className="flex items-center gap-2 -ml-2 sm:ml-0"
                    size="sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Back to Invoices</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">
                      Created on {formatDate(invoice.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  {getStatusBadge(invoice.status)}
                  <div className="flex gap-1 sm:gap-2 flex-wrap">
                {invoice.status === 'draft' && (
                  <>
                    <Button
                      onClick={() => router.push(`/finance/invoicing/${invoice.id}/edit`)}
                      variant="outline"
                      size="sm"
                      className="text-xs sm:text-sm"
                    >
                      <Edit className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button onClick={handleMarkAsSent} size="sm" className="text-xs sm:text-sm">
                      <Send className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Mark as Sent</span>
                      <span className="sm:hidden">Send</span>
                    </Button>
                  </>
                )}
                {invoice.status === 'sent' && (
                  <Button onClick={handleMarkAsPaid} size="sm" className="text-xs sm:text-sm">
                    <CheckCircle className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Mark as Paid</span>
                    <span className="sm:hidden">Paid</span>
                  </Button>
                )}
                <Button variant="outline" onClick={handlePrint} size="sm" className="text-xs sm:text-sm">
                  <Printer className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleViewPDF} 
                  size="sm" 
                  className="text-xs sm:text-sm"
                  disabled={isGeneratingPDF}
                >
                  <Eye className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">View PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden print:shadow-none">
              {/* Invoice Header */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-50 px-6 sm:px-10 py-6 sm:py-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
              <div className="space-y-2">
                <div className="flex flex-col gap-2 mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Right Stay Logo" className="w-12 h-12 object-contain" />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Right Stay (PTY) LTD</h2>
                    <p className="text-xs sm:text-sm text-black font-medium">RIGHT STAY AFRICA</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-black">
                  <p className="font-medium">Cape Town Western Cape 8000</p>
                  <p>South Africa</p>
                  <p className="break-all">rightstayza@gmail.com</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <h3 className="text-2xl sm:text-3xl font-bold text-black mb-4 tracking-wide">
                  {invoice.invoice_title ? invoice.invoice_title.toUpperCase() : 'INVOICE'}
                </h3>
                <div className="space-y-1.5 text-sm text-gray-700 bg-white rounded-lg p-3 shadow-sm">
                  <p className="font-semibold"><span className="text-gray-500">Invoice #:</span> {invoice.invoice_number}</p>
                  <p><span className="text-gray-500">Date:</span> {formatDate(invoice.invoice_date)}</p>
                  <p><span className="text-gray-500">Due Date:</span> {formatDate(invoice.due_date)}</p>
                  <p><span className="text-gray-500">Terms:</span> {invoice.terms || 'Due on Receipt'}</p>
                </div>
              </div>
            </div>
            </div>

            {/* Client Information */}
            <div className="px-6 sm:px-10 py-6 sm:py-8 border-b border-gray-200 bg-white">
            <div className="flex flex-col sm:flex-row sm:justify-between gap-6">
              <div className="flex-1">
                <h4 className="font-bold text-black mb-3 text-sm uppercase tracking-wide">Bill To</h4>
                <div className="space-y-1">
                  <p className="text-black font-semibold text-base break-words">
                    {invoice.client_prefix ? `${invoice.client_prefix} ` : ''}{invoice.client_name}
                  </p>
                  {invoice.client_email && (
                    <p className="text-sm text-black break-all">{invoice.client_email}</p>
                  )}
                  {invoice.client_phone && (
                    <p className="text-sm text-black">{invoice.client_phone}</p>
                  )}
                  {invoice.client_address && (
                    <p className="text-sm text-black break-words">{invoice.client_address}</p>
                  )}
                </div>
              </div>
              <div className="sm:text-right">
                <h4 className="font-bold text-black mb-3 text-sm uppercase tracking-wide">Subject</h4>
                <p className="text-base text-black font-medium">
                  {invoice.subject_description || `${invoice.apartment?.apartment_number || 'N/A'} - Rental Invoice`}
                </p>
              </div>
            </div>
            </div>

            {/* Line Items */}
            <div className="px-6 sm:px-10 py-6 sm:py-8">
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="text-left py-4 px-4 sm:px-6 font-semibold text-xs sm:text-sm uppercase tracking-wide">#</th>
                        <th className="text-left py-4 px-4 sm:px-6 font-semibold text-xs sm:text-sm uppercase tracking-wide">Item & Description</th>
                        <th className="text-right py-4 px-4 sm:px-6 font-semibold text-xs sm:text-sm uppercase tracking-wide">Qty</th>
                        <th className="text-right py-4 px-4 sm:px-6 font-semibold text-xs sm:text-sm uppercase tracking-wide">Rate</th>
                        <th className="text-right py-4 px-4 sm:px-6 font-semibold text-xs sm:text-sm uppercase tracking-wide">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {invoice.line_items.map((item, index) => (
                        <tr key={index} className="hover:bg-green-50/50 transition-colors">
                          <td className="py-4 px-4 sm:px-6 text-sm sm:text-base text-gray-900 whitespace-nowrap font-medium">{index + 1}</td>
                          <td className="py-4 px-4 sm:px-6 text-sm sm:text-base text-gray-900 break-words">{item.description}</td>
                          <td className="py-4 px-4 sm:px-6 text-sm sm:text-base text-right text-gray-900 whitespace-nowrap">{item.quantity}</td>
                          <td className="py-4 px-4 sm:px-6 text-sm sm:text-base text-right text-gray-700 whitespace-nowrap">{formatCurrency(item.rate)}</td>
                          <td className="py-4 px-4 sm:px-6 text-sm sm:text-base text-right text-gray-900 font-semibold whitespace-nowrap">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="mt-6 sm:mt-8 flex justify-end px-6 sm:px-10">
              <div className="w-full sm:w-80">
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6 space-y-3 border border-gray-200">
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm sm:text-base text-gray-700 font-medium">Sub Total</span>
                    <span className="text-sm sm:text-base text-gray-900 font-semibold">{formatCurrency(invoice.subtotal)}</span>
                  </div>
                  {invoice.tax_amount && invoice.tax_amount > 0 ? (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm sm:text-base text-gray-700 font-medium">VAT (15%)</span>
                      <span className="text-sm sm:text-base text-gray-900 font-semibold">{formatCurrency(invoice.tax_amount)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm sm:text-base text-gray-700 font-medium">VAT (15%)</span>
                      <span className="text-sm sm:text-base text-gray-900 font-semibold">{formatCurrency(invoice.subtotal * 0.15)}</span>
                    </div>
                  )}
                  {invoice.discount_amount && invoice.discount_amount > 0 && (
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm sm:text-base text-gray-700 font-medium">Discount</span>
                      <span className="text-sm sm:text-base text-red-600 font-semibold">-{formatCurrency(invoice.discount_amount)}</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-300 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-base sm:text-lg font-bold text-gray-900">Total</span>
                      <span className="text-base sm:text-lg font-bold text-gray-900 underline">{formatCurrency(invoice.total_amount)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-green-50 rounded-md px-3 mt-2">
                    <span className="text-sm sm:text-base font-bold text-gray-900">Balance Due</span>
                    <span className="text-sm sm:text-base font-bold text-gray-900">{formatCurrency(invoice.balance_due)}</span>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Notes and Banking Details */}
            <div className="px-6 sm:px-10 py-6 sm:py-8 bg-gradient-to-br from-gray-50 to-slate-50 border-t-2 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Banking Details */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Banking Details</h4>
                  <div className="text-sm sm:text-base text-gray-700 space-y-2 bg-white rounded-lg p-4 border border-gray-200">
                    {invoice.bank_account ? (
                      <>
                        <p><span className="font-semibold text-gray-900">Beneficiary:</span> {invoice.bank_account.beneficiary_name}</p>
                        <p><span className="font-semibold text-gray-900">Account Number:</span> {invoice.bank_account.account_number}</p>
                        <p><span className="font-semibold text-gray-900">Branch Code:</span> {invoice.bank_account.branch_code}</p>
                        <p><span className="font-semibold text-gray-900">Bank:</span> {invoice.bank_account.bank_name}</p>
                      </>
                    ) : (
                      <>
                        <p><span className="font-semibold text-gray-900">Beneficiary:</span> Right Stay (PTY) LTD</p>
                        <p><span className="font-semibold text-gray-900">Account Number:</span> 63120936985</p>
                        <p><span className="font-semibold text-gray-900">Branch Code:</span> 250655</p>
                        <p><span className="font-semibold text-gray-900">Bank:</span> First National Bank (FNB/RMB)</p>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Notes */}
                {invoice.notes && (
                  <div>
                    <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wide">Notes</h4>
                    <div className="text-sm sm:text-base text-gray-700 bg-white rounded-lg p-4 border border-gray-200">
                      <p>{invoice.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thank You Message */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-center text-gray-700 font-medium italic">Thank you for your business.</p>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthWrapper>
      <InvoiceViewContent params={params} />
    </AuthWrapper>
  );
}
