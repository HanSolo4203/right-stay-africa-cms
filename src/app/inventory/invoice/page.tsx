'use client';

import { useState, useEffect } from 'react';
import { InventoryItem } from '@/lib/types';
import { Package, FileText, Download, Printer } from 'lucide-react';

export default function InventoryInvoicePage() {
  const [detergents, setDetergents] = useState<InventoryItem[]>([]);
  const [welcomePacks, setWelcomePacks] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/inventory');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch inventory data');
        }

        const items = data.data || [];
        setDetergents(items.filter((item: InventoryItem) => item.item_type === 'detergent'));
        setWelcomePacks(items.filter((item: InventoryItem) => item.item_type === 'welcome_pack'));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        console.error('Error fetching inventory data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('invoice-content');
    if (element) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Inventory Breakdown - Right Stay Africa</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .company-name { font-size: 24px; font-weight: bold; color: #1f2937; }
                .report-title { font-size: 18px; color: #6b7280; margin-top: 5px; }
                .date { text-align: right; color: #6b7280; margin-bottom: 20px; }
                .section { margin-bottom: 30px; }
                .section-title { font-size: 16px; font-weight: bold; color: #1f2937; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                .table th { background-color: #f9fafb; font-weight: bold; color: #374151; }
                .table tr:hover { background-color: #f9fafb; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .total-row { font-weight: bold; background-color: #f3f4f6; }
                .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
                @media print { .no-print { display: none; } }
              </style>
            </head>
            <body>
              ${element.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <FileText className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalDetergents = detergents.length;
  const totalWelcomePacks = welcomePacks.length;
  const totalItems = totalDetergents + totalWelcomePacks;

  const detergentsValue = detergents.reduce((sum, item) => {
    const itemValue = (item.purchase_price || 0) * (item.current_stock || 0);
    return sum + itemValue;
  }, 0);

  const welcomePacksValue = welcomePacks.reduce((sum, item) => {
    const itemValue = (item.purchase_price || 0) * (item.current_stock || 0);
    return sum + itemValue;
  }, 0);

  const totalValue = detergentsValue + welcomePacksValue;

  return (
    <div className="min-h-screen bg-white">
      {/* Print Controls - Hidden when printing */}
      <div className="no-print bg-gray-50 border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-900">Inventory Breakdown</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div id="invoice-content" className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Right Stay Africa</h1>
          <p className="text-lg text-gray-600 mt-2">Inventory Breakdown Report</p>
          <p className="text-sm text-gray-500 mt-1">
            Generated on {new Date().toLocaleDateString('en-ZA', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">Total Items</p>
                <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">Detergents</p>
                <p className="text-2xl font-bold text-green-900">{totalDetergents}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-800">Welcome Packs</p>
                <p className="text-2xl font-bold text-purple-900">{totalWelcomePacks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detergents Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-blue-200 pb-2">
            Detergents Inventory
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Level
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detergents.map((item) => {
                  const unitPrice = item.purchase_price || 0;
                  const totalValue = unitPrice * (item.current_stock || 0);
                  const isLowStock = item.min_stock_level && (item.current_stock || 0) <= item.min_stock_level;
                  
                  return (
                    <tr key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {isLowStock && (
                          <div className="text-xs text-red-600">⚠️ Low Stock</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.current_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit_of_measure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.min_stock_level || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        R {unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        R {totalValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-50 font-bold">
                  <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-900">
                    Detergents Total Value:
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    R {detergentsValue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Welcome Pack Items Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-purple-200 pb-2">
            Welcome Pack Items Inventory
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Level
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {welcomePacks.map((item) => {
                  const unitPrice = item.purchase_price || 0;
                  const totalValue = unitPrice * (item.current_stock || 0);
                  const isLowStock = item.min_stock_level && (item.current_stock || 0) <= item.min_stock_level;
                  
                  return (
                    <tr key={item.id} className={isLowStock ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {isLowStock && (
                          <div className="text-xs text-red-600">⚠️ Low Stock</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.current_stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.unit_of_measure}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.min_stock_level || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        R {unitPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                        R {totalValue.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-purple-50 font-bold">
                  <td colSpan={5} className="px-6 py-4 text-right text-sm text-gray-900">
                    Welcome Pack Items Total Value:
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    R {welcomePacksValue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Grand Total */}
        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Total Inventory Value</h3>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">R {totalValue.toFixed(2)}</div>
              <div className="text-sm text-gray-600">
                {totalItems} items across {totalDetergents} detergents and {totalWelcomePacks} welcome pack items
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>This report was generated automatically by the Right Stay Africa CMS</p>
          <p className="mt-1">For questions or corrections, please contact the system administrator</p>
        </div>
      </div>
    </div>
  );
}
