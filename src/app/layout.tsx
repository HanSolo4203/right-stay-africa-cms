import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Right Stay Africa - Cleaning Management System',
  description: 'Professional cleaning management system for apartment complexes and property management companies.',
  keywords: ['cleaning', 'management', 'apartments', 'property', 'scheduling', 'analytics'],
  authors: [{ name: 'Right Stay Africa' }],
  creator: 'Right Stay Africa',
  publisher: 'Right Stay Africa',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://rightstayafrica.com'),
  openGraph: {
    title: 'Right Stay Africa - Cleaning Management System',
    description: 'Professional cleaning management system for apartment complexes and property management companies.',
    url: 'https://rightstayafrica.com',
    siteName: 'Right Stay Africa',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Right Stay Africa - Cleaning Management System',
    description: 'Professional cleaning management system for apartment complexes and property management companies.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={`${inter.className} h-full bg-gray-50`}>
        <div className="min-h-full">
          <Header />
          <main className="py-8">
            {children}
          </main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}