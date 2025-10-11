'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, LogIn, Calendar, BarChart3, Settings, FileText, DollarSign, BookOpen, ChevronDown, TrendingUp } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Reports', href: '/reports/monthly-expenses', icon: FileText },
  { 
    name: 'Finance', 
    icon: DollarSign,
    submenu: [
      { name: 'Bookings', href: '/bookings', icon: BookOpen },
      { name: 'Owner Statements', href: '/finance/owner-statements', icon: DollarSign },
      { name: 'Analytics', href: '/finance/analytics', icon: TrendingUp },
    ]
  },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);

  // Hide header on the login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left logo */}
          <div className="flex items-center w-32">
            <Link href="/" className="flex items-center space-x-2">
              <div suppressHydrationWarning>
                <Image
                  src="/logo.png"
                  alt="Right Stay Africa"
                  width={200}
                  height={200}
                  priority
                  quality={100}
                  sizes="200px"
                  className="h-20 w-auto"
                  style={{ objectFit: 'contain' }}
                />
              </div>
            </Link>
          </div>

          {/* Centered Navigation */}
          <div className="hidden md:flex items-center space-x-8 justify-center">
            {user && (
              <nav className="flex space-x-8">
                {navigation.map((item) => {
                    if (item.submenu) {
                      // Dropdown for Finance
                      const isActive = item.submenu.some(sub => pathname === sub.href);
                      return (
                        <div 
                          key={item.name} 
                          className="relative"
                          onMouseEnter={() => setFinanceOpen(true)}
                          onMouseLeave={() => setFinanceOpen(false)}
                        >
                          <button
                            onClick={() => setFinanceOpen(!financeOpen)}
                            className={cn(
                              'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            )}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.name}</span>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {financeOpen && (
                            <div 
                              className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1"
                            >
                              {item.submenu.map((subItem) => {
                                const subIsActive = pathname === subItem.href;
                                return (
                                  <Link
                                    key={subItem.name}
                                    href={subItem.href}
                                    className={cn(
                                      'flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors',
                                      subIsActive
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                    )}
                                    onClick={() => setFinanceOpen(false)}
                                  >
                                    <subItem.icon className="w-4 h-4" />
                                    <span>{subItem.name}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // Regular navigation items
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
              </nav>
            )}
          </div>

          {/* User Menu (Right) */}
          <div className="hidden md:flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
              onClick={() => setMobileOpen((v) => !v)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {user ? (
            <div className="space-y-1">
              {/* Navigation Links */}
              {navigation.map((item) => {
                  if (item.submenu) {
                    // Submenu for Finance in mobile
                    return (
                      <div key={item.name}>
                        <div className="flex items-center space-x-2 px-3 py-2 text-base font-medium text-gray-600">
                          <item.icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                        <div className="ml-6 space-y-1">
                          {item.submenu.map((subItem) => {
                            const subIsActive = pathname === subItem.href;
                            return (
                              <Link
                                key={subItem.name}
                                href={subItem.href}
                                className={cn(
                                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium',
                                  subIsActive
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                )}
                                onClick={() => setMobileOpen(false)}
                              >
                                <subItem.icon className="w-4 h-4" />
                                <span>{subItem.name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium',
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              
              {/* User Info and Logout */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600">
                  <User className="w-5 h-5" />
                  <span>{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md text-base font-medium hover:bg-blue-700 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn className="w-5 h-5" />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
      )}
    </header>
  );
}
