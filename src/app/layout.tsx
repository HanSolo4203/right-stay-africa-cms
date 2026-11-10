import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AppShell } from '@/components/layout/app-shell';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import DisableNumberInputScroll from '@/components/DisableNumberInputScroll';

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
    { media: '(prefers-color-scheme: light)', color: 'oklch(0.99 0 0)' },
    { media: '(prefers-color-scheme: dark)', color: 'oklch(0.15 0 0)' },
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
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
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
