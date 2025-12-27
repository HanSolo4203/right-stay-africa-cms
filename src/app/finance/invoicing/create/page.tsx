'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save,
  Calendar,
  User,
  DollarSign,
  Eye,
  CreditCard
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AuthWrapper from '@/components/AuthWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InvoiceLineItem, BankAccountDetail, Invoice } from '@/lib/types';
import { generateInvoicePDF } from '@/lib/pdf-generator';

interface CreateInvoiceData {
  guest_id: string;
  apartment_id: string;
  invoice_date: string;
  due_date: string;
  invoice_title?: string;
  client_name: string;
  client_prefix?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  line_items: InvoiceLineItem[];
  notes?: string;
  terms?: string;
  bank_account_id?: string;
}

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Apartment {
  id: string;
  apartment_number: string;
  owner_name: string;
}

function CreateInvoiceContent() {
  const router = useRouter();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCustomTitle, setShowCustomTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  
  // Predefined invoice titles (can be extended with custom titles)
  const [predefinedTitles, setPredefinedTitles] = useState<string[]>([
    'Right Stay Service Invoice',
    'Accommodation Invoice',
  ]);

  const [formData, setFormData] = useState<CreateInvoiceData>({
    guest_id: '',
    apartment_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    invoice_title: 'Right Stay Service Invoice',
    client_name: '',
    client_prefix: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    line_items: [
      {
        description: '',
        quantity: 1,
        rate: 0,
        amount: 0,
      }
    ],
    notes: 'Thank you for your business.',
    terms: 'Due on Receipt',
    bank_account_id: '',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load guests, apartments, and bank accounts
      const [guestsResponse, apartmentsResponse, bankAccountsResponse] = await Promise.all([
        fetch('/api/guests'),
        fetch('/api/apartments'),
        fetch('/api/settings/bank-accounts'),
      ]);

      if (guestsResponse.ok) {
        const guestsData = await guestsResponse.json();
        setGuests(guestsData.data || []);
      }

      if (apartmentsResponse.ok) {
        const apartmentsData = await apartmentsResponse.json();
        setApartments(apartmentsData.data || []);
      }

      if (bankAccountsResponse.ok) {
        const bankAccountsData = await bankAccountsResponse.json();
        const accounts = bankAccountsData.data || [];
        setBankAccounts(accounts);
        
        // Set default bank account if available
        const defaultAccount = accounts.find((acc: BankAccountDetail) => acc.is_default);
        if (defaultAccount && !formData.bank_account_id) {
          setFormData(prev => ({ ...prev, bank_account_id: defaultAccount.id }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleClientNameChange = (guestId: string) => {
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      setFormData(prev => ({
        ...prev,
        guest_id: guestId,
        client_name: guest.name,
        client_email: guest.email || '',
        client_phone: guest.phone || '',
      }));
    }
  };

  const handleInvoiceTitleChange = (title: string) => {
    if (title === 'custom') {
      setShowCustomTitle(true);
      // Keep current title if it exists and is not in predefined list
      if (formData.invoice_title && !predefinedTitles.includes(formData.invoice_title)) {
        setCustomTitle(formData.invoice_title);
      }
    } else {
      setShowCustomTitle(false);
      setFormData(prev => ({ ...prev, invoice_title: title }));
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: value,
    };

    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      newLineItems[index].amount = newLineItems[index].quantity * newLineItems[index].rate;
    }

    setFormData(prev => ({
      ...prev,
      line_items: newLineItems,
    }));

    // Recalculate subtotal
    const subtotal = newLineItems.reduce((sum, item) => sum + item.amount, 0);
    setFormData(prev => ({
      ...prev,
      subtotal,
    }));
  };

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: '',
          quantity: 1,
          rate: 0,
          amount: 0,
        }
      ]
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.line_items.length > 1) {
      const newLineItems = formData.line_items.filter((_, i) => i !== index);
      const subtotal = newLineItems.reduce((sum, item) => sum + item.amount, 0);
      
      setFormData(prev => ({
        ...prev,
        line_items: newLineItems,
        subtotal,
      }));
    }
  };

  const handleSave = async (status: 'draft' | 'sent' = 'draft') => {
    try {
      setSaving(true);

      // Validate required fields
      if (!formData.guest_id || !formData.apartment_id || !formData.client_name || !formData.invoice_title) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (formData.line_items.some(item => !item.description || item.amount <= 0)) {
        toast.error('Please fill in all line items with valid amounts');
        return;
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          status,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Invoice ${status === 'draft' ? 'created' : 'created and sent'} successfully`);
        router.push(`/finance/invoicing/${data.data.id}`);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const vatAmount = formData.subtotal * 0.15;
  const totalAmount = formData.subtotal + vatAmount + (formData.tax_amount || 0) - (formData.discount_amount || 0);

  const handleViewInvoice = async () => {
    // Validate required fields
    if (!formData.guest_id || !formData.apartment_id || !formData.client_name || !formData.invoice_title) {
      toast.error('Please fill in all required fields before viewing invoice');
      return;
    }

    if (formData.line_items.some(item => !item.description || item.amount <= 0)) {
      toast.error('Please fill in all line items with valid amounts');
      return;
    }

    // Create a temporary invoice object for preview
    const selectedBankAccount = bankAccounts.find(acc => acc.id === formData.bank_account_id);
    const defaultBankAccount = bankAccounts.find(acc => acc.is_default) || bankAccounts[0];
    const bankAccount = selectedBankAccount || defaultBankAccount;

    const previewInvoice = {
      id: 'preview',
      invoice_number: 'PREVIEW',
      guest_id: formData.guest_id,
      apartment_id: formData.apartment_id,
      invoice_date: formData.invoice_date,
      due_date: formData.due_date,
      invoice_title: formData.invoice_title,
      status: 'draft' as const,
      client_name: formData.client_name,
      client_prefix: formData.client_prefix,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      client_address: formData.client_address,
      subtotal: formData.subtotal,
      tax_amount: formData.tax_amount || 0,
      discount_amount: formData.discount_amount || 0,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      line_items: formData.line_items,
      notes: formData.notes,
      terms: formData.terms || 'Due on Receipt',
      bank_account_id: formData.bank_account_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      apartment: apartments.find(apt => apt.id === formData.apartment_id),
      bank_account: bankAccount,
    };

    try {
      toast.loading('Generating invoice preview...');
      await generateInvoicePDF(previewInvoice as Invoice);
      toast.dismiss();
    } catch (error) {
      console.error('Error generating invoice preview:', error);
      toast.error('Failed to generate invoice preview');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/finance/invoicing')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
                <p className="text-gray-600 mt-1">
                  Create a new invoice for a guest or direct booking
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleViewInvoice}
                disabled={saving}
              >
                <Eye className="h-4 w-4 mr-2" />
                View Invoice
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSave('sent')}
                disabled={saving}
              >
                Create & Send
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Client Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="client_name_dropdown">Client Name *</Label>
                  <Select value={formData.guest_id} onValueChange={handleClientNameChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client name" />
                    </SelectTrigger>
                    <SelectContent>
                      {guests.map((guest) => (
                        <SelectItem key={guest.id} value={guest.id}>
                          {guest.name} {guest.email && `(${guest.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.client_name && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="client_prefix">Prefix</Label>
                      <Select 
                        value={formData.client_prefix || undefined} 
                        onValueChange={(value) => {
                          // If "none" is selected, clear the prefix
                          if (value === 'none') {
                            setFormData(prev => ({ ...prev, client_prefix: undefined }));
                          } else {
                            setFormData(prev => ({ ...prev, client_prefix: value }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select prefix (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Mr.">Mr.</SelectItem>
                          <SelectItem value="Mrs.">Mrs.</SelectItem>
                          <SelectItem value="Ms.">Ms.</SelectItem>
                          <SelectItem value="Miss">Miss</SelectItem>
                          <SelectItem value="Dr.">Dr.</SelectItem>
                          <SelectItem value="Prof.">Prof.</SelectItem>
                          <SelectItem value="Rev.">Rev.</SelectItem>
                          <SelectItem value="Hon.">Hon.</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="client_name">Client Name *</Label>
                      <Input
                        id="client_name"
                        value={formData.client_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                        placeholder="Enter client name"
                      />
                      {formData.client_prefix && (
                        <p className="text-xs text-gray-500 mt-1">
                          Full name: {formData.client_prefix} {formData.client_name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!formData.client_name && (
                  <div>
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                      id="client_name"
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Enter client name"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="apartment">Apartment *</Label>
                  <Select 
                    value={formData.apartment_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, apartment_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an apartment" />
                    </SelectTrigger>
                    <SelectContent>
                      {apartments.map((apartment) => (
                        <SelectItem key={apartment.id} value={apartment.id}>
                          {apartment.apartment_number} - {apartment.owner_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_email">Email</Label>
                    <Input
                      id="client_email"
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_phone">Phone</Label>
                    <Input
                      id="client_phone"
                      value={formData.client_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_address">Address</Label>
                    <Input
                      id="client_address"
                      value={formData.client_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_address: e.target.value }))}
                      placeholder="Enter address"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="invoice_title">Invoice Title *</Label>
                  {!showCustomTitle ? (
                    <Select 
                      value={formData.invoice_title && predefinedTitles.includes(formData.invoice_title) 
                        ? formData.invoice_title 
                        : formData.invoice_title && !predefinedTitles.includes(formData.invoice_title)
                        ? 'custom'
                        : formData.invoice_title || ''} 
                      onValueChange={handleInvoiceTitleChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select invoice title" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedTitles.map((title) => (
                          <SelectItem key={title} value={title}>
                            {title}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add Custom Title</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        value={customTitle}
                        onChange={(e) => {
                          setCustomTitle(e.target.value);
                          setFormData(prev => ({ ...prev, invoice_title: e.target.value }));
                        }}
                        placeholder="Enter custom invoice title"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          onClick={() => {
                            if (customTitle) {
                              if (!predefinedTitles.includes(customTitle)) {
                                setPredefinedTitles(prev => [...prev, customTitle]);
                              }
                              setFormData(prev => ({ ...prev, invoice_title: customTitle }));
                              setShowCustomTitle(false);
                            }
                          }}
                        >
                          Use This Title
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomTitle(false);
                            if (formData.invoice_title && !predefinedTitles.includes(formData.invoice_title)) {
                              setCustomTitle(formData.invoice_title);
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  {formData.invoice_title && !showCustomTitle && !predefinedTitles.includes(formData.invoice_title) && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current: {formData.invoice_title} (custom)
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="invoice_date">Invoice Date *</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="terms">Terms</Label>
                  <Input
                    id="terms"
                    value={formData.terms}
                    onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                    placeholder="e.g., Due on Receipt"
                  />
                </div>

                <div>
                  <Label htmlFor="bank_account">Bank Account Details</Label>
                  <Select 
                    value={formData.bank_account_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, bank_account_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <span>{account.account_name}</span>
                            {account.is_default && (
                              <span className="text-xs text-gray-500">(Default)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.bank_account_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      {bankAccounts.find(acc => acc.id === formData.bank_account_id)?.bank_name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Line Items
                  </span>
                  <Button onClick={addLineItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.line_items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-6">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          placeholder="Enter item description"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Rate</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Amount</Label>
                        <div className="p-2 bg-gray-50 rounded border text-sm font-medium">
                          {formatCurrency(item.amount)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        {formData.line_items.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional notes..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(formData.subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">VAT (15%)</span>
                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Additional Tax</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.tax_amount || 0}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          tax_amount: parseFloat(e.target.value) || 0 
                        }))}
                        className="w-20 h-8"
                      />
                      <span className="font-medium">{formatCurrency(formData.tax_amount || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discount_amount || 0}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          discount_amount: parseFloat(e.target.value) || 0 
                        }))}
                        className="w-20 h-8"
                      />
                      <span className="font-medium">{formatCurrency(formData.discount_amount || 0)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateInvoicePage() {
  return (
    <AuthWrapper>
      <CreateInvoiceContent />
    </AuthWrapper>
  );
}
