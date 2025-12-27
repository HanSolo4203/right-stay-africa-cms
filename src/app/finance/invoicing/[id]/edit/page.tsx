'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AuthWrapper from '@/components/AuthWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Invoice, InvoiceLineItem } from '@/lib/types';

interface EditInvoiceData {
  invoice_date: string;
  due_date: string;
  invoice_title?: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  apartment_number?: string;
  subject_description?: string;
  subtotal: number;
  tax_amount?: number;
  discount_amount?: number;
  line_items: InvoiceLineItem[];
  notes?: string;
  terms?: string;
}

function EditInvoiceContent({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  
  // Unwrap the params Promise using React.use()
  const { id } = use(params);

  const [showCustomTitle, setShowCustomTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  
  // Predefined invoice titles (matching create page)
  const predefinedTitles = [
    'Right Stay Service Invoice',
    'Accommodation Invoice',
  ];

  const [formData, setFormData] = useState<EditInvoiceData>({
    invoice_date: '',
    due_date: '',
    invoice_title: 'Right Stay Service Invoice',
    client_name: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    apartment_number: '',
    subject_description: '',
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    line_items: [],
    notes: '',
    terms: 'Due on Receipt'
  });

  useEffect(() => {
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${id}`);
      if (response.ok) {
        const data = await response.json();
        const invoiceData = data.data;
        setInvoice(invoiceData);
        
        // Pre-populate form with existing data
        // Generate default subject if not exists
        const defaultSubject = invoiceData.apartment?.apartment_number 
          ? `${invoiceData.apartment.apartment_number} - Rental Invoice`
          : 'Rental Invoice';
        
        setFormData({
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          invoice_title: invoiceData.invoice_title || 'Right Stay Service Invoice',
          client_name: invoiceData.client_name,
          client_email: invoiceData.client_email || '',
          client_phone: invoiceData.client_phone || '',
          client_address: invoiceData.client_address || '',
          apartment_number: invoiceData.apartment?.apartment_number || '',
          subject_description: invoiceData.subject_description || defaultSubject,
          subtotal: invoiceData.subtotal,
          tax_amount: invoiceData.tax_amount || 0,
          discount_amount: invoiceData.discount_amount || 0,
          line_items: invoiceData.line_items || [],
          notes: invoiceData.notes || '',
          terms: invoiceData.terms || 'Due on Receipt'
        });
        setHasUnsavedChanges(false);
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

  const handleInputChange = (field: keyof EditInvoiceData, value: string | number | InvoiceLineItem[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    }
  };

  // Helper function to select all text when field contains "0" on focus
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.target;
    const numValue = parseFloat(input.value);
    // If the value is 0, select all text so user input replaces it
    if (!isNaN(numValue) && numValue === 0) {
      input.select();
    }
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updatedItems = [...formData.line_items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // Recalculate amount
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }
    
    setFormData(prev => ({
      ...prev,
      line_items: updatedItems
    }));
    
    // Recalculate subtotal
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    setFormData(prev => ({
      ...prev,
      subtotal: newSubtotal
    }));
    setHasUnsavedChanges(true);
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    };
    
    setFormData(prev => ({
      ...prev,
      line_items: [...prev.line_items, newItem]
    }));
    setHasUnsavedChanges(true);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = formData.line_items.filter((_, i) => i !== index);
    const newSubtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    
    setFormData(prev => ({
      ...prev,
      line_items: updatedItems,
      subtotal: newSubtotal
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Remove fields that shouldn't be sent to the API (apartment_number is a display field)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { apartment_number, ...dataToSave } = formData;
      
      console.log('Saving invoice data:', dataToSave);
      
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      
      if (response.ok) {
        await response.json();
        setHasUnsavedChanges(false);
        toast.success('Invoice updated successfully');
        router.push(`/finance/invoicing/${id}`);
      } else {
        let errorMessage = 'Failed to update invoice';
        try {
          const errorData = await response.json();
          console.error('Error response data:', errorData);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // If response is not JSON, try to get text
          try {
            const text = await response.text();
            console.error('Error response text:', text);
            if (text) {
              errorMessage = text;
            }
          } catch {
            console.error('Failed to parse error response');
            // Use default error message
          }
        }
        console.error('Save error:', errorMessage, 'Status:', response.status);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to update invoice';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleNavigation = (url: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(url);
      setShowUnsavedWarning(true);
    } else {
      router.push(url);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  const handleSaveDraft = async () => {
    await handleSave();
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  };

  const handleCancelWarning = () => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      
      const response = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Invoice deleted successfully');
        router.push('/finance/invoicing');
      } else {
        toast.error('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => handleNavigation(`/finance/invoicing/${id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Invoice
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Invoice {invoice.invoice_number}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Apartment:</span>
                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {formData.apartment_number || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Guest:</span>
                    <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                      {formData.client_name || 'Not specified'}
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mt-1">
                  Update invoice details and line items
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleNavigation(`/finance/invoicing/${id}`)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete Invoice'}
              </Button>
              <Button onClick={handleSave} disabled={saving || deleting}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invoice_title">Invoice Title</Label>
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
                        setHasUnsavedChanges(true);
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
                            setFormData(prev => ({ ...prev, invoice_title: customTitle }));
                            setShowCustomTitle(false);
                            setHasUnsavedChanges(true);
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
                  <Label htmlFor="invoice_date">Invoice Date</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => handleInputChange('invoice_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject_description">Subject Description</Label>
                <Input
                  id="subject_description"
                  value={formData.subject_description}
                  onChange={(e) => handleInputChange('subject_description', e.target.value)}
                  placeholder="e.g., 307 - Rental Invoice"
                />
              </div>
              
              <div>
                <Label htmlFor="terms">Terms</Label>
                <Input
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => handleInputChange('terms', e.target.value)}
                  placeholder="e.g., Due on Receipt, Net 30"
                />
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    value={formData.client_name}
                    onChange={(e) => handleInputChange('client_name', e.target.value)}
                    placeholder="Enter client name"
                  />
                </div>
                <div>
                  <Label htmlFor="apartment_number">Apartment Number</Label>
                  <Input
                    id="apartment_number"
                    value={formData.apartment_number}
                    onChange={(e) => handleInputChange('apartment_number', e.target.value)}
                    placeholder="Enter apartment number"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => handleInputChange('client_email', e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="client_phone">Phone</Label>
                  <Input
                    id="client_phone"
                    value={formData.client_phone}
                    onChange={(e) => handleInputChange('client_phone', e.target.value)}
                    placeholder="+27 82 123 4567"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="client_address">Address</Label>
                <Textarea
                  id="client_address"
                  value={formData.client_address}
                  onChange={(e) => handleInputChange('client_address', e.target.value)}
                  placeholder="Enter client address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button onClick={addLineItem} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.line_items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div>
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <Textarea
                        id={`description-${index}`}
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        placeholder="Enter item description"
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                        <Input
                          id={`quantity-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          onFocus={handleNumberFocus}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`rate-${index}`}>Rate</Label>
                        <Input
                          id={`rate-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleLineItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                          onFocus={handleNumberFocus}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`amount-${index}`}>Amount</Label>
                        <Input
                          id={`amount-${index}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => handleLineItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {formData.line_items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No line items added yet.</p>
                    <Button onClick={addLineItem} variant="outline" className="mt-2">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal">Subtotal</Label>
                  <Input
                    id="subtotal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="tax_amount">Additional Tax Amount</Label>
                  <Input
                    id="tax_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax_amount}
                    onChange={(e) => handleInputChange('tax_amount', parseFloat(e.target.value) || 0)}
                    onFocus={handleNumberFocus}
                  />
                </div>
                <div>
                  <Label htmlFor="discount_amount">Discount Amount</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount_amount}
                    onChange={(e) => handleInputChange('discount_amount', parseFloat(e.target.value) || 0)}
                    onFocus={handleNumberFocus}
                  />
                </div>
              </div>
              
              {/* VAT Display */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-blue-900">VAT (15%):</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(formData.subtotal * 0.15)}
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(formData.subtotal + (formData.subtotal * 0.15) + (formData.tax_amount || 0) - (formData.discount_amount || 0))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter any additional notes for this invoice"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Unsaved Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-6">
                You have unsaved changes. Would you like to save your changes before leaving?
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelWarning}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDiscardChanges}
                  disabled={saving}
                >
                  Discard Changes
                </Button>
                <Button
                  onClick={handleSaveDraft}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthWrapper>
      <EditInvoiceContent params={params} />
    </AuthWrapper>
  );
}
