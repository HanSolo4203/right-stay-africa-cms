import type { Metadata, Viewport } from 'next';
import { Rubik } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import DisableNumberInputScroll from '@/components/DisableNumberInputScroll';

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Right Stay CMS',
  description:
    'Cleaning scheduler and operations console for Right Stay Africa short-term rentals in Cape Town.',
  metadataBase: new URL('https://ops.rightstayafrica.com'),
  openGraph: {
    title: 'Right Stay CMS',
    description:
      'Cleaning scheduler and operations console for Right Stay Africa.',
    url: 'https://ops.rightstayafrica.com',
    siteName: 'Right Stay Africa',
    locale: 'en_ZA',
    type: 'website',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1b24' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-ZA"
      className={`${rubik.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>
            <DisableNumberInputScroll />
            <AppShell>{children}</AppShell>
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
