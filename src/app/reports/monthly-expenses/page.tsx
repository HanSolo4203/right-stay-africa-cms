'use client';

import MonthlyExpenseReport from '@/components/ui/MonthlyExpenseReport';
import AuthWrapper from '@/components/AuthWrapper';
import { Toaster } from 'react-hot-toast';

export default function MonthlyExpensesPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Monthly Expense Reports</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Comprehensive monthly expense analysis and reporting for RSA Laundry Service
            </p>
          </div>

          {/* Monthly Expense Report Component */}
          <MonthlyExpenseReport />
        </div>
      </div>
      <Toaster position="top-right" />
    </AuthWrapper>
  );
}
