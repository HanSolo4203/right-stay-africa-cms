'use client';

import React, { useState } from 'react';
import { FileText, Download, Printer, Calendar, User, X } from 'lucide-react';
import { CleaningSessionDetailed } from '@/lib/types';

interface InvoiceGeneratorProps {
  apartment: {
    apartment_number: string;
    owner_name: string;
    cleaning_count: number;
    total_amount: number;
    apartment_id: string;
  };
  cleaningSessions: CleaningSessionDetailed[];
  month?: string;
  year?: string;
  onClose: () => void;
}

export default function InvoiceGenerator({ 
  apartment, 
  cleaningSessions, 
  month, 
  year, 
  onClose 
}: InvoiceGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPeriod = () => {
    if (month) {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    } else if (year) {
      return year;
    }
    return 'All Time';
  };

  const generateInvoiceHTML = () => {
    const invoiceNumber = `INV-${apartment.apartment_number}-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const issueDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${apartment.apartment_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              background: #fff;
              padding: 20px;
            }
            .invoice-container { max-width: 800px; margin: 0 auto; }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 40px; 
              padding-bottom: 20px; 
              border-bottom: 3px solid #3b82f6; 
            }
            .company-info h1 { 
              color: #1e40af; 
              font-size: 28px; 
              font-weight: bold; 
              margin-bottom: 5px; 
            }
            .company-info p { 
              color: #6b7280; 
              font-size: 14px; 
            }
            .invoice-details { text-align: right; }
            .invoice-details h2 { 
              color: #1f2937; 
              font-size: 24px; 
              margin-bottom: 10px; 
            }
            .invoice-details p { 
              color: #6b7280; 
              font-size: 14px; 
              margin-bottom: 5px; 
            }
            .billing-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 40px; 
              margin-bottom: 40px; 
            }
            .billing-section h3 { 
              color: #1f2937; 
              font-size: 18px; 
              margin-bottom: 15px; 
              padding-bottom: 5px; 
              border-bottom: 2px solid #e5e7eb; 
            }
            .billing-section p { 
              color: #6b7280; 
              margin-bottom: 5px; 
            }
            .services-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
              box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
            }
            .services-table th { 
              background: #f8fafc; 
              color: #374151; 
              font-weight: 600; 
              padding: 15px; 
              text-align: left; 
              border-bottom: 2px solid #e5e7eb; 
            }
            .services-table td { 
              padding: 15px; 
              border-bottom: 1px solid #e5e7eb; 
            }
            .services-table tr:nth-child(even) { background: #f9fafb; }
            .services-table tr:hover { background: #f3f4f6; }
            .date-col { color: #6b7280; }
            .cleaner-col { color: #374151; }
            .amount-col { 
              color: #059669; 
              font-weight: 600; 
              text-align: right; 
            }
            .total-section { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              margin-top: 20px; 
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              margin-bottom: 10px; 
            }
            .total-row.final { 
              font-size: 18px; 
              font-weight: bold; 
              color: #1f2937; 
              border-top: 2px solid #e5e7eb; 
              padding-top: 15px; 
              margin-top: 15px; 
            }
            .notes { 
              margin-top: 30px; 
              padding: 20px; 
              background: #fef3c7; 
              border-left: 4px solid #f59e0b; 
              border-radius: 4px; 
            }
            .notes h4 { 
              color: #92400e; 
              margin-bottom: 10px; 
            }
            .notes p { 
              color: #78350f; 
              font-size: 14px; 
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #6b7280; 
              font-size: 12px; 
              border-top: 1px solid #e5e7eb; 
              padding-top: 20px; 
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="company-info">
                <h1>Right Stay Africa</h1>
                <p>Professional Cleaning Services</p>
                <p>Email: info@rightstayafrica.com</p>
                <p>Phone: +27 (0) 11 123 4567</p>
              </div>
              <div class="invoice-details">
                <h2>INVOICE</h2>
                <p><strong>Invoice #:</strong> ${invoiceNumber}</p>
                <p><strong>Issue Date:</strong> ${issueDate}</p>
                <p><strong>Period:</strong> ${formatPeriod()}</p>
              </div>
            </div>

            <div class="billing-info">
              <div class="billing-section">
                <h3>Bill To:</h3>
                <p><strong>${apartment.owner_name}</strong></p>
                <p>Apartment ${apartment.apartment_number}</p>
                <p>Right Stay Africa Property</p>
              </div>
              <div class="billing-section">
                <h3>Service Details:</h3>
                <p><strong>Property:</strong> Apartment ${apartment.apartment_number}</p>
                <p><strong>Service Period:</strong> ${formatPeriod()}</p>
                <p><strong>Total Cleanings:</strong> ${apartment.cleaning_count}</p>
              </div>
            </div>

            <table class="services-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Cleaner</th>
                  <th>Service</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${cleaningSessions.map(session => `
                  <tr>
                    <td class="date-col">${formatDate(session.cleaning_date)}</td>
                    <td class="cleaner-col">${session.cleaner_name}</td>
                    <td>Cleaning Service</td>
                    <td class="amount-col">R${session.price ? session.price.toFixed(2) : '150.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>R${apartment.total_amount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>VAT (0%):</span>
                <span>R0.00</span>
              </div>
              <div class="total-row final">
                <span>Total Amount:</span>
                <span>R${apartment.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div class="notes">
              <h4>Payment Information</h4>
              <p>Payment is due within 30 days of invoice date. Please contact us for payment methods and bank details.</p>
            </div>

            <div class="footer">
              <p>Thank you for choosing Right Stay Africa for your cleaning needs!</p>
              <p>This invoice was generated on ${issueDate}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const html = generateInvoiceHTML();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadHTML = () => {
    const html = generateInvoiceHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${apartment.apartment_number}-${month || year || 'all'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Invoice for Apartment {apartment.apartment_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Invoice Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Invoice Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Apartment:</span>
                      <span className="font-medium">{apartment.apartment_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">{apartment.owner_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Period:</span>
                      <span className="font-medium">{formatPeriod()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cleanings:</span>
                      <span className="font-medium">{apartment.cleaning_count}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-900 font-semibold">Total Amount:</span>
                      <span className="text-green-600 font-bold text-lg">R{apartment.total_amount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Cleaning Sessions</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cleaningSessions.map((session) => (
                      <div key={session.id} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2 text-sm">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(session.cleaning_date)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{session.cleaner_name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">
                              R{session.price ? session.price.toFixed(2) : '150.00'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5 mr-2" />
                    Print Invoice
                  </>
                )}
              </button>

              <button
                onClick={downloadHTML}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Download HTML
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
