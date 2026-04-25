// Note: runtime is intentionally NOT set here. Each API route/page declares
// its own `export const runtime = 'edge'` explicitly. The root layout must not
// declare edge runtime as it propagates to ALL child routes — including
// auto-generated workflow SDK routes that require Node.js (node:module).

import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { I18nProvider } from '@/lib/i18n';
import { Toaster } from 'sonner';
import { CookieConsent } from '@/components/ui/cookie-consent';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CashBash.ai', template: '%s | CashBash.ai' },
  description: 'AI-powered personal finance tracker. Track spending, visualize money, and get smart insights — automatically.',
  manifest: '/manifest.webmanifest',
  keywords: ['personal finance', 'budget tracker', 'AI finance', 'expense tracker', 'money management'],
  authors: [{ name: 'DrVelu' }],
  creator: 'DrVelu',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://cashbash.ai',
    title: 'CashBash.ai — AI-Powered Finance Tracker',
    description: 'Your money, beautifully organized. Just say what you spent — AI does the rest.',
    siteName: 'CashBash.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CashBash.ai',
    description: 'AI-powered personal finance tracker',
  },
  icons: { icon: '/favicon.ico', apple: '/apple-icon.png', shortcut: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1120' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} font-sans antialiased grain-overlay`}>
        <I18nProvider>
          <Providers>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                classNames: {
                  toast: 'rounded-xl border shadow-glass font-sans backdrop-blur-sm',
                  title: 'font-semibold text-sm',
                  description: 'text-xs text-muted-foreground',
                },
              }}
            />
            <CookieConsent />
          </Providers>
        </I18nProvider>
      </body>
    </html>
  );
}
