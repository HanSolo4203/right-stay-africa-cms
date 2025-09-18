'use client';

import { useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const startTime = Date.now();
    
    console.log('[LOGIN PAGE] Login form submitted:', {
      email: email ? `${email.substring(0, 3)}***` : 'undefined',
      timestamp: new Date().toISOString()
    });

    try {
      console.log('[LOGIN PAGE] Sending request to /api/auth/login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('[LOGIN PAGE] Response received:', {
        status: response.status,
        statusText: response.statusText,
        duration: `${Date.now() - startTime}ms`
      });

      const data = await response.json();
      console.log('[LOGIN PAGE] Response data:', {
        success: response.ok,
        hasUser: !!data.user,
        hasSession: !!data.session,
        error: data.error || null
      });

      if (response.ok) {
        console.log('[LOGIN PAGE] Login successful, redirecting to dashboard...');
        toast.success('Login successful!');
        // Redirect to calendar as the first page after login
        window.location.href = '/calendar';
      } else {
        console.error('[LOGIN PAGE] Login failed:', data.error);
        toast.error(data.error || 'Login failed');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('[LOGIN PAGE] Network or unexpected error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      toast.error('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-50 pt-6 pb-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div>
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Right Stay Africa logo"
              width={700}
              height={700}
              className="h-[140px] w-auto"
              priority
            />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Right Stay Africa Cleaning Management Service
          </p>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
