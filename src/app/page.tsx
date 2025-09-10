import Link from 'next/link';
import { Calendar, BarChart3, Settings, Users, Building2 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Right Stay Africa
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Professional cleaning management system designed to streamline your operations
            and ensure exceptional service delivery across all properties.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Building2 className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">25+</h3>
            <p className="text-gray-600">Active Properties</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">15+</h3>
            <p className="text-gray-600">Professional Cleaners</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">200+</h3>
            <p className="text-gray-600">Monthly Sessions</p>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link
            href="/dashboard"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center border border-gray-100 hover:border-blue-200"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Dashboard</h3>
            <p className="text-gray-600 mb-4">
              View comprehensive analytics, performance metrics, and key insights
              about your cleaning operations.
            </p>
            <span className="text-blue-600 font-medium group-hover:text-blue-700">
              View Dashboard →
            </span>
          </Link>

          <Link
            href="/calendar"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center border border-gray-100 hover:border-green-200"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Calendar</h3>
            <p className="text-gray-600 mb-4">
              Schedule and manage cleaning sessions, track appointments,
              and coordinate cleaner assignments.
            </p>
            <span className="text-green-600 font-medium group-hover:text-green-700">
              View Calendar →
            </span>
          </Link>

          <Link
            href="/settings"
            className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 text-center border border-gray-100 hover:border-purple-200"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Settings</h3>
            <p className="text-gray-600 mb-4">
              Configure system settings, manage properties, cleaners,
              and customize your cleaning management preferences.
            </p>
            <span className="text-purple-600 font-medium group-hover:text-purple-700">
              View Settings →
            </span>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500">
          <p>© 2024 Right Stay Africa. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
